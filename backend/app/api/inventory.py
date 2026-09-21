from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_company_user
from app.db.session import get_db
from app.models import InventoryTransaction, Product, Role, TransactionType, User
from app.schemas.inventory import StockAdjustRequest, StockMoveRequest, TransactionRead
from app.schemas.product import ProductRead
from app.services.inventory import apply_stock_change

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _transaction_to_read(tx: InventoryTransaction) -> TransactionRead:
    return TransactionRead(
        id=tx.id,
        product_id=tx.product_id,
        product_name=tx.product.name,
        product_sku=tx.product.sku,
        location_id=tx.location_id,
        location_name=tx.location.name if tx.location else None,
        transfer_id=tx.transfer_id,
        transfer_reference=tx.transfer.reference if tx.transfer else None,
        user_id=tx.user_id,
        user_name=tx.user.name,
        type=tx.type,
        quantity_change=tx.quantity_change,
        previous_quantity=tx.previous_quantity,
        new_quantity=tx.new_quantity,
        note=tx.note,
        created_at=tx.created_at,
    )


@router.post("/stock-in", response_model=ProductRead)
def stock_in(
    payload: StockMoveRequest,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    product, _ = apply_stock_change(
        db,
        current_user.company_id,
        payload.product_id,
        current_user,
        payload.quantity,
        TransactionType.STOCK_IN,
        payload.note,
        payload.location_id,
    )
    return product


@router.post("/stock-out", response_model=ProductRead)
def stock_out(
    payload: StockMoveRequest,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    product, _ = apply_stock_change(
        db,
        current_user.company_id,
        payload.product_id,
        current_user,
        -payload.quantity,
        TransactionType.STOCK_OUT,
        payload.note,
        payload.location_id,
    )
    return product


@router.post("/adjust", response_model=ProductRead)
def adjust_stock(
    payload: StockAdjustRequest,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (Role.COMPANY_ADMIN, Role.MANAGER):
        raise HTTPException(403, "Only company admins and managers can adjust stock")
    if payload.quantity_change == 0:
        raise HTTPException(400, "Adjustment quantity cannot be zero")

    product, _ = apply_stock_change(
        db,
        current_user.company_id,
        payload.product_id,
        current_user,
        payload.quantity_change,
        TransactionType.ADJUSTMENT,
        payload.reason,
        payload.location_id,
    )
    return product


@router.get("/transactions", response_model=list[TransactionRead])
def list_transactions(
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
    product_id: int | None = None,
    type: TransactionType | None = None,
    location_id: int | None = None,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    query = select(InventoryTransaction).where(InventoryTransaction.company_id == current_user.company_id)
    if product_id is not None:
        query = query.where(InventoryTransaction.product_id == product_id)
    if type is not None:
        query = query.where(InventoryTransaction.type == type)
    if location_id is not None:
        query = query.where(InventoryTransaction.location_id == location_id)
    if user_id is not None:
        query = query.where(InventoryTransaction.user_id == user_id)
    if date_from is not None:
        query = query.where(InventoryTransaction.created_at >= date_from)
    if date_to is not None:
        query = query.where(InventoryTransaction.created_at <= date_to)
    query = query.order_by(InventoryTransaction.created_at.desc()).limit(limit)

    transactions = db.scalars(query).all()
    return [_transaction_to_read(t) for t in transactions]


@router.get("/low-stock", response_model=list[ProductRead])
def low_stock_products(
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Product)
        .where(
            Product.company_id == current_user.company_id,
            Product.quantity <= Product.minimum_stock_level,
        )
        .order_by(Product.id)
    ).all()
