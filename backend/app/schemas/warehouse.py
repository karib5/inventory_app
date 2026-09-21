from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WarehouseCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    address: str | None = Field(default=None, max_length=1000)
    image_url: str | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    address: str | None = Field(default=None, max_length=1000)
    image_url: str | None = None
    is_active: bool | None = None


class WarehouseRead(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    description: str | None
    address: str | None
    image_url: str | None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WarehouseSummary(WarehouseRead):
    product_count: int
    total_units: int


class WarehouseDetail(WarehouseRead):
    location_count: int
    area_count: int
    rack_count: int
    shelf_count: int
    product_count: int
    total_units: int
