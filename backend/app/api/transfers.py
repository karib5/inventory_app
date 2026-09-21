from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_company_user
from app.db.session import get_db
from app.models import StockTransfer, User
from app.schemas.transfer import TransferCreate, TransferRead
from app.services.inventory import transfer_stock

router = APIRouter(prefix="/inventory", tags=["Stock Transfers"])


def _transfer_to_read(transfer: StockTransfer) -> TransferRead:
    return TransferRead(
        id=transfer.id,
        reference=transfer.reference,
        product_id=transfer.product_id,
        product_name=transfer.product.name,
        product_sku=transfer.product.sku,
        from_location_id=transfer.from_location_id,
        from_location_name=transfer.from_location.name,
        to_location_id=transfer.to_location_id,
        to_location_name=transfer.to_location.name,
        quantity=transfer.quantity,
        user_id=transfer.user_id,
        user_name=transfer.user.name,
        note=transfer.note,
        created_at=transfer.created_at,
    )


@router.post("/transfers", response_model=TransferRead, status_code=201)
def create_transfer(
    payload: TransferCreate,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    transfer, _out_tx, _in_tx = transfer_stock(
        db,
        current_user.company_id,
        payload.product_id,
        payload.from_location_id,
        payload.to_location_id,
        payload.quantity,
        current_user,
        payload.note,
    )
    return _transfer_to_read(transfer)


@router.get("/transfers", response_model=list[TransferRead])
def list_transfers(
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
    product_id: int | None = None,
    location_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    query = select(StockTransfer).where(StockTransfer.company_id == current_user.company_id)
    if product_id is not None:
        query = query.where(StockTransfer.product_id == product_id)
    if location_id is not None:
        query = query.where(
            (StockTransfer.from_location_id == location_id) | (StockTransfer.to_location_id == location_id)
        )
    query = query.order_by(StockTransfer.created_at.desc()).limit(limit)
    transfers = db.scalars(query).all()
    return [_transfer_to_read(t) for t in transfers]
