from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=80)
    barcode: str | None = None
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    image_url: str | None = None
    quantity: int = Field(default=0, ge=0)
    minimum_stock_level: int = Field(default=10, ge=0)
    location_id: int | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    barcode: str | None = None
    description: str | None = None
    image_url: str | None = None
    minimum_stock_level: int | None = Field(default=None, ge=0)


class ProductRead(ProductCreate):
    id: int
    company_id: int
    model_config = ConfigDict(from_attributes=True)


class ProductStockLocationRead(BaseModel):
    location_id: int
    location_code: str
    location_name: str
    warehouse_id: int | None
    warehouse_name: str | None
    quantity: int
