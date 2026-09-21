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


class ProductStockLocationRead(BaseModel):
    location_id: int
    location_code: str
    location_name: str
    warehouse_id: int | None
    warehouse_name: str | None
    # Full Warehouse -> Area -> Rack -> Shelf breadcrumb, e.g.
    # ["Main Warehouse", "Shirt Area", "Rack 1", "Shelf 2"] - lets the UI
    # show exactly where a product physically lives without the caller
    # having to walk the location hierarchy itself.
    path: list[str]
    quantity: int


class ProductRead(ProductCreate):
    id: int
    company_id: int
    is_active: bool
    # Populated (batched, not per-row) by list_products only - every other
    # endpoint that returns a ProductRead leaves this as its default empty
    # list, same as it always implicitly did before this field existed.
    stock_locations: list[ProductStockLocationRead] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)
