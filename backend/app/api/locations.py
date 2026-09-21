from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_company_user
from app.db.session import get_db
from app.models import Location, Role, User, Warehouse
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate

router = APIRouter(prefix="/locations", tags=["Locations"])


def _validate_hierarchy(db: Session, company_id: int, warehouse_id: int | None, parent_id: int | None) -> None:
    if warehouse_id is not None and not db.scalar(
        select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.company_id == company_id)
    ):
        raise HTTPException(400, "Warehouse does not belong to this company")
    if parent_id is not None and not db.scalar(
        select(Location).where(Location.id == parent_id, Location.company_id == company_id)
    ):
        raise HTTPException(400, "Parent location does not belong to this company")


@router.get("", response_model=list[LocationRead])
def list_locations(
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
    warehouse_id: int | None = None,
    parent_id: int | None = None,
):
    query = select(Location).where(Location.company_id == current_user.company_id)
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
    _validate_hierarchy(db, current_user.company_id, payload.warehouse_id, payload.parent_id)
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
    warehouse_id = updates.get("warehouse_id", location.warehouse_id)
    parent_id = updates.get("parent_id", location.parent_id)
    if parent_id == location_id:
        raise HTTPException(400, "A location cannot be its own parent")
    _validate_hierarchy(db, current_user.company_id, warehouse_id, parent_id)

    for field, value in updates.items():
        setattr(location, field, value)
    db.commit()
    db.refresh(location)
    return location
