from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import authorize_company_delete, get_current_user, require_company_user
from app.core.security import verify_password
from app.db.session import get_db
from app.models import InventoryTransaction, Location, LocationType, Product, ProductStock, Role, User, Warehouse
from app.schemas.auth import DeleteResult, PasswordConfirm
from app.schemas.location import LocationStock
from app.schemas.warehouse import WarehouseCreate, WarehouseDetail, WarehouseRead, WarehouseSummary, WarehouseUpdate

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


@router.get("", response_model=list[WarehouseSummary])
def list_warehouses(current_user: User = Depends(require_company_user), db: Session = Depends(get_db)):
    warehouses = db.scalars(
        select(Warehouse).where(Warehouse.company_id == current_user.company_id).order_by(Warehouse.id)
    ).all()

    stats_rows = db.execute(
        select(
            Location.warehouse_id,
            func.count(func.distinct(ProductStock.product_id)),
            func.coalesce(func.sum(ProductStock.quantity), 0),
        )
        .join(ProductStock, ProductStock.location_id == Location.id)
        .where(
            Location.company_id == current_user.company_id,
            Location.is_active.is_(True),
            ProductStock.quantity > 0,
        )
        .group_by(Location.warehouse_id)
    ).all()
    stats_by_warehouse = {row[0]: (row[1], row[2]) for row in stats_rows}

    return [
        WarehouseSummary(
            id=w.id,
            company_id=w.company_id,
            code=w.code,
            name=w.name,
            description=w.description,
            address=w.address,
            image_url=w.image_url,
            is_active=w.is_active,
            created_at=w.created_at,
            product_count=stats_by_warehouse.get(w.id, (0, 0))[0],
            total_units=stats_by_warehouse.get(w.id, (0, 0))[1],
        )
        for w in warehouses
    ]


@router.post("", response_model=WarehouseRead, status_code=201)
def create_warehouse(
    payload: WarehouseCreate,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (Role.COMPANY_ADMIN, Role.MANAGER):
        raise HTTPException(403, "Only company admins and managers can create warehouses")
    if db.scalar(
        select(Warehouse).where(Warehouse.company_id == current_user.company_id, Warehouse.code == payload.code)
    ):
        raise HTTPException(409, "Warehouse code already exists")
    warehouse = Warehouse(company_id=current_user.company_id, **payload.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.get("/{warehouse_id}", response_model=WarehouseDetail)
def get_warehouse(
    warehouse_id: int,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    warehouse = db.scalar(
        select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.company_id == current_user.company_id)
    )
    if not warehouse:
        raise HTTPException(404, "Warehouse not found")

    location_count = db.scalar(
        select(func.count())
        .select_from(Location)
        .where(Location.warehouse_id == warehouse_id, Location.is_active.is_(True))
    )
    # "Area" covers both historical location_type values (zone/aisle) that
    # existing data may already be using for this level of the hierarchy.
    area_count = db.scalar(
        select(func.count()).select_from(Location).where(
            Location.warehouse_id == warehouse_id,
            Location.location_type.in_([LocationType.ZONE, LocationType.AISLE]),
            Location.is_active.is_(True),
        )
    )
    rack_count = db.scalar(
        select(func.count()).select_from(Location).where(
            Location.warehouse_id == warehouse_id,
            Location.location_type == LocationType.RACK,
            Location.is_active.is_(True),
        )
    )
    shelf_count = db.scalar(
        select(func.count()).select_from(Location).where(
            Location.warehouse_id == warehouse_id,
            Location.location_type == LocationType.SHELF,
            Location.is_active.is_(True),
        )
    )
    product_count, total_units = db.execute(
        select(
            func.count(func.distinct(ProductStock.product_id)),
            func.coalesce(func.sum(ProductStock.quantity), 0),
        )
        .join(Location, Location.id == ProductStock.location_id)
        .where(Location.warehouse_id == warehouse_id, Location.is_active.is_(True), ProductStock.quantity > 0)
    ).first()

    return WarehouseDetail(
        id=warehouse.id,
        company_id=warehouse.company_id,
        code=warehouse.code,
        name=warehouse.name,
        description=warehouse.description,
        address=warehouse.address,
        image_url=warehouse.image_url,
        is_active=warehouse.is_active,
        created_at=warehouse.created_at,
        location_count=location_count or 0,
        area_count=area_count or 0,
        rack_count=rack_count or 0,
        shelf_count=shelf_count or 0,
        product_count=product_count or 0,
        total_units=total_units or 0,
    )


@router.get("/{warehouse_id}/location-stock", response_model=list[LocationStock])
def get_warehouse_location_stock(
    warehouse_id: int,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    """Per-location product/unit counts (racks and shelves alike) for the
    visual warehouse builder, computed in one query instead of the
    frontend fetching every product's stock breakdown one at a time."""
    warehouse = db.scalar(
        select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.company_id == current_user.company_id)
    )
    if not warehouse:
        raise HTTPException(404, "Warehouse not found")

    rows = db.execute(
        select(
            ProductStock.location_id,
            func.count(func.distinct(ProductStock.product_id)),
            func.sum(ProductStock.quantity),
        )
        .join(Location, Location.id == ProductStock.location_id)
        .where(Location.warehouse_id == warehouse_id, Location.is_active.is_(True), ProductStock.quantity > 0)
        .group_by(ProductStock.location_id)
    ).all()
    return [LocationStock(location_id=row[0], product_count=row[1], total_units=row[2]) for row in rows]


@router.patch("/{warehouse_id}", response_model=WarehouseRead)
def update_warehouse(
    warehouse_id: int,
    payload: WarehouseUpdate,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (Role.COMPANY_ADMIN, Role.MANAGER):
        raise HTTPException(403, "Only company admins and managers can update warehouses")
    warehouse = db.scalar(
        select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.company_id == current_user.company_id)
    )
    if not warehouse:
        raise HTTPException(404, "Warehouse not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(warehouse, field, value)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.post("/{warehouse_id}/confirm-delete", response_model=DeleteResult)
def confirm_delete_warehouse(
    warehouse_id: int,
    payload: PasswordConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Password-gated deletion. A warehouse with no inventory history
    anywhere in its area/rack/shelf tree is removed outright, along with
    its (empty) locations. One that does have history - any product still
    assigned there, or any past transaction at one of its locations - is
    archived instead (is_active=False) so its history is never destroyed."""
    warehouse = db.scalar(select(Warehouse).where(Warehouse.id == warehouse_id))
    if not warehouse:
        raise HTTPException(404, "Warehouse not found")
    authorize_company_delete(current_user, warehouse.company_id)

    if not verify_password(payload.password, current_user.password_hash):
        # 400, not 401: the frontend's global API wrapper treats any 401 on a
        # token-bearing request as "your session expired" and force-logs the
        # user out (see api.ts) - a wrong confirmation password must surface
        # as a normal in-modal error instead, not sign the admin out.
        raise HTTPException(400, "Incorrect password")

    # All-time locations (including already-removed ones) for the audit-trail
    # check below - a past transaction must block hard-delete forever,
    # regardless of whether the location it happened at still exists. Only
    # *active* locations count for the live-state checks (a product still
    # assigned there, or stock still sitting there) - a location that was
    # already removed can't be silently hiding "live" state a delete would
    # destroy, since removing a location already requires clearing its stock.
    all_location_ids = db.scalars(select(Location.id).where(Location.warehouse_id == warehouse_id)).all()
    active_location_ids = db.scalars(
        select(Location.id).where(Location.warehouse_id == warehouse_id, Location.is_active.is_(True))
    ).all()
    has_history = False
    if all_location_ids:
        has_history = bool(
            db.scalar(
                select(InventoryTransaction.id).where(InventoryTransaction.location_id.in_(all_location_ids)).limit(1)
            )
        )
    if not has_history and active_location_ids:
        has_history = bool(
            db.scalar(select(Product.id).where(Product.location_id.in_(active_location_ids)).limit(1))
            or db.scalar(
                select(ProductStock.id)
                .where(ProductStock.location_id.in_(active_location_ids), ProductStock.quantity > 0)
                .limit(1)
            )
        )

    warehouse_name = warehouse.name
    if has_history:
        warehouse.is_active = False
        db.commit()
        return DeleteResult(
            result="archived",
            message=f'"{warehouse_name}" has inventory history, so it was deactivated instead of deleted - its '
            "structure and stock history are preserved, but it's no longer available for new activity.",
        )

    if all_location_ids:
        db.execute(delete(Location).where(Location.id.in_(all_location_ids)))
    db.delete(warehouse)
    db.commit()
    return DeleteResult(result="deleted", message=f'"{warehouse_name}" was permanently deleted.')
