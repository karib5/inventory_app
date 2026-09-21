from datetime import datetime

from pydantic import BaseModel, Field


class TransferCreate(BaseModel):
    product_id: int
    from_location_id: int
    to_location_id: int
    quantity: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=255)


class TransferRead(BaseModel):
    id: int
    reference: str
    product_id: int
    product_name: str
    product_sku: str
    from_location_id: int
    from_location_name: str
    to_location_id: int
    to_location_name: str
    quantity: int
    user_id: int
    user_name: str
    note: str | None
    created_at: datetime
