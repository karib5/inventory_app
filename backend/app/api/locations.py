from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_company_user
from app.db.session import get_db
from app.models import InventoryTransaction, Location, LocationType, Product, ProductStock, Role, TransactionType, User, Warehouse
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate

router = APIRouter(prefix="/locations", tags=["Locations"])


def _validate_hierarchy(db: Session, company_id: int, warehouse_id: int | None, parent_id: int | None) -> Location | None:
    if warehouse_id is not None and not db.scalar(
        select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.company_id == company_id)
    ):
        raise HTTPException(400, "Warehouse does not belong to this company")
    parent = None
    if parent_id is not None:
        parent = db.scalar(select(Location).where(Location.id == parent_id, Location.company_id == company_id))
        if not parent:
            raise HTTPException(400, "Parent location does not belong to this company")
    return parent


def _check_rack_capacity(db: Session, parent: Location | None, exclude_id: int | None = None) -> None:
    """A rack's parent (an Area) may cap how many direct rack children it
    accepts, via its own capacity field. Only relevant when the new/moved
    location is itself a rack directly under that area."""
    if parent is None or parent.capacity is None:
        return
    query = select(Location).where(
        Location.parent_id == parent.id, Location.location_type == LocationType.RACK, Location.is_active.is_(True)
    )
    if exclude_id is not None:
        query = query.where(Location.id != exclude_id)
    existing = len(db.scalars(query).all())
    if existing >= parent.capacity:
        raise HTTPException(400, f"Maximum rack capacity reached ({parent.capacity}/{parent.capacity}).")


def _check_position_free(
    db: Session, company_id: int, parent_id: int | None, position_x: int | None, position_y: int | None, exclude_id: int | None = None
) -> None:
    """Two siblings (racks in the same area, or shelves in the same rack)
    can't occupy the same grid cell - this is what makes "no overlapping
    racks" a property of the data rather than something the UI has to
    police on its own."""
    if position_x is None or position_y is None:
        return
    query = select(Location).where(
        Location.company_id == company_id,
        Location.parent_id == parent_id,
        Location.position_x == position_x,
        Location.position_y == position_y,
        Location.is_active.is_(True),
    )
    if exclude_id is not None:
        query = query.where(Location.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(409, "Another item already occupies that position.")


def _location_and_descendant_ids(db: Session, location_id: int) -> list[int]:
    """A rack's shelves (or an area's racks and their shelves) must never be
    silently hidden while they still hold stock - the visual builder simply
    stops listing an inactive location, so hiding one with stock still
    assigned would make that stock impossible to find. Walks the whole
    subtree so a rack removal is checked against its shelves too."""
    ids = [location_id]
    frontier = [location_id]
    while frontier:
        children = db.scalars(select(Location.id).where(Location.parent_id.in_(frontier))).all()
        if not children:
            break
        ids.extend(children)
        frontier = children
    return ids


def _clear_subtree_stock(db: Session, current_user: User, subtree_ids: list[int], removed_location_name: str) -> None:
    """Clears every ProductStock row (quantity > 0) at any of these
    locations, the same way a manual stock-out would: a recorded, properly
    attributed InventoryTransaction per row plus a matching drop in the
    product's cached total - never a silent delete of live stock. Used only
    when a location is force-removed while it still holds stock."""
    stock_rows = db.scalars(
        select(ProductStock).where(ProductStock.location_id.in_(subtree_ids), ProductStock.quantity > 0)
    ).all()
    for stock in stock_rows:
        product = db.get(Product, stock.product_id)
        previous_quantity = product.quantity
        product.quantity = max(previous_quantity - stock.quantity, 0)
        db.add(
            InventoryTransaction(
                company_id=current_user.company_id,
                product_id=product.id,
                location_id=stock.location_id,
                user_id=current_user.id,
                type=TransactionType.ADJUSTMENT,
                quantity_change=-stock.quantity,
                previous_quantity=previous_quantity,
                new_quantity=product.quantity,
                note=f'Stock cleared - "{removed_location_name}" was removed',
            )
        )
        db.delete(stock)


@router.get("", response_model=list[LocationRead])
def list_locations(
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
    warehouse_id: int | None = None,
    parent_id: int | None = None,
):
    query = select(Location).where(Location.company_id == current_user.company_id, Location.is_active.is_(True))
    if warehouse_id is not None:
        query = query.where(Location.warehouse_id == warehouse_id)
    if parent_id is not None:
        query = query.where(Location.parent_id == parent_id)
    return db.scalars(query.order_by(Location.id)).all()


@router.post("", response_model=LocationRead, status_code=201)
def create_location(
    payload: LocationCreate,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (Role.COMPANY_ADMIN, Role.MANAGER):
        raise HTTPException(403, "Only company admins and managers can create locations")
    if db.scalar(select(Location).where(Location.company_id == current_user.company_id, Location.code == payload.code)):
        raise HTTPException(409, "Location code already exists")
    parent = _validate_hierarchy(db, current_user.company_id, payload.warehouse_id, payload.parent_id)
    if payload.location_type == LocationType.RACK:
        _check_rack_capacity(db, parent)
    _check_position_free(db, current_user.company_id, payload.parent_id, payload.position_x, payload.position_y)

    location = Location(company_id=current_user.company_id, **payload.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.patch("/{location_id}", response_model=LocationRead)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (Role.COMPANY_ADMIN, Role.MANAGER):
        raise HTTPException(403, "Only company admins and managers can update locations")
    location = db.scalar(
        select(Location).where(Location.id == location_id, Location.company_id == current_user.company_id)
    )
    if not location:
        raise HTTPException(404, "Location not found")

    updates = payload.model_dump(exclude_unset=True)
    force = updates.pop("force", False)
    warehouse_id = updates.get("warehouse_id", location.warehouse_id)
    parent_id = updates.get("parent_id", location.parent_id)
    if parent_id == location_id:
        raise HTTPException(400, "A location cannot be its own parent")
    parent = _validate_hierarchy(db, current_user.company_id, warehouse_id, parent_id)

    descendant_ids: list[int] = []
    if updates.get("is_active") is False and location.is_active:
        subtree_ids = _location_and_descendant_ids(db, location.id)
        descendant_ids = subtree_ids[1:]
        has_stock = db.scalar(
            select(ProductStock.id).where(ProductStock.location_id.in_(subtree_ids), ProductStock.quantity > 0).limit(1)
        )
        if has_stock:
            if not force:
                raise HTTPException(
                    400,
                    "This location (or a shelf inside it) still holds stock. Move it first, or remove this "
                    "location anyway to clear that stock.",
                )
            _clear_subtree_stock(db, current_user, subtree_ids, location.name)

    effective_type = updates.get("location_type", location.location_type)
    if effective_type == LocationType.RACK and (parent_id != location.parent_id or "location_type" in updates):
        _check_rack_capacity(db, parent, exclude_id=location_id)

    position_x = updates.get("position_x", location.position_x)
    position_y = updates.get("position_y", location.position_y)
    if "position_x" in updates or "position_y" in updates or parent_id != location.parent_id:
        _check_position_free(db, current_user.company_id, parent_id, position_x, position_y, exclude_id=location_id)

    for field, value in updates.items():
        setattr(location, field, value)

    if descendant_ids:
        # Removing a rack (or area) also removes what's inside it - a shelf
        # left behind, still "active", under a parent that no longer shows
        # up anywhere would be unreachable in the builder from then on.
        for descendant in db.scalars(select(Location).where(Location.id.in_(descendant_ids))):
            descendant.is_active = False

    db.commit()
    db.refresh(location)
    return location
