from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_company_user
from app.db.session import get_db
from app.models import Location, ProductStock, Role, User, Warehouse
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
        .where(Location.company_id == current_user.company_id, ProductStock.quantity > 0)
        .group_by(Location.warehouse_id)
    ).all()
    stats_by_warehouse = {row[0]: (row[1], row[2]) for row in stats_rows}

    return [
        WarehouseSummary(
            id=w.id,
            company_id=w.company_id,
            code=w.code,
            name=w.name,
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
        select(func.count()).select_from(Location).where(Location.warehouse_id == warehouse_id)
    )
    return WarehouseDetail(
        id=warehouse.id,
        company_id=warehouse.company_id,
        code=warehouse.code,
        name=warehouse.name,
        address=warehouse.address,
        image_url=warehouse.image_url,
        is_active=warehouse.is_active,
        created_at=warehouse.created_at,
        location_count=location_count or 0,
    )


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
