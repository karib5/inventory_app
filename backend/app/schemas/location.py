from pydantic import BaseModel, ConfigDict, Field

from app.models import LocationType
from app.schemas.auth import PasswordConfirm


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=1000)
    warehouse_id: int | None = None
    parent_id: int | None = None
    location_type: LocationType | None = None
    position_x: int | None = Field(default=None, ge=0)
    position_y: int | None = Field(default=None, ge=0)
    capacity: int | None = Field(default=None, ge=0)


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    warehouse_id: int | None = None
    parent_id: int | None = None
    location_type: LocationType | None = None
    position_x: int | None = Field(default=None, ge=0)
    position_y: int | None = Field(default=None, ge=0)
    capacity: int | None = Field(default=None, ge=0)
    # Removing a location (there is no way to reactivate one afterwards,
    # unlike a warehouse) is password-gated - see LocationRemoveRequest and
    # POST /locations/{id}/confirm-remove instead of setting is_active here.


class LocationRemoveRequest(PasswordConfirm):
    # Only meaningful when the location (or anything under it) still holds
    # stock: without it, removing one is refused. With it, that stock is
    # cleared first - as a recorded adjustment transaction, never silently -
    # and then the whole subtree is deactivated.
    force: bool = False


class LocationRead(BaseModel):
    id: int
    company_id: int
    warehouse_id: int | None
    parent_id: int | None
    location_type: LocationType | None
    name: str
    code: str
    description: str | None
    position_x: int | None
    position_y: int | None
    capacity: int | None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class LocationStock(BaseModel):
    location_id: int
    product_count: int
    total_units: int


class TransferOutRequest(BaseModel):
    to_location_id: int


class TransferOutResult(BaseModel):
    product_count: int
    total_units: int
    message: str
