from datetime import datetime

from pydantic import BaseModel, Field

from app.models import TransactionType


class StockMoveRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    location_id: int | None = None
    note: str | None = Field(default=None, max_length=255)


class StockAdjustRequest(BaseModel):
    product_id: int
    quantity_change: int
    location_id: int | None = None
    reason: str = Field(min_length=1, max_length=255)


class TransactionRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_sku: str
    location_id: int | None
    location_name: str | None
    transfer_id: int | None
    transfer_reference: str | None
    user_id: int
    user_name: str
    type: TransactionType
    quantity_change: int
    previous_quantity: int
    new_quantity: int
    note: str | None
    created_at: datetime
