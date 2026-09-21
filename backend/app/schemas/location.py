from pydantic import BaseModel, ConfigDict, Field

from app.models import LocationType


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=50)
    warehouse_id: int | None = None
    parent_id: int | None = None
    location_type: LocationType | None = None


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    warehouse_id: int | None = None
    parent_id: int | None = None
    location_type: LocationType | None = None
    is_active: bool | None = None


class LocationRead(BaseModel):
    id: int
    company_id: int
    warehouse_id: int | None
    parent_id: int | None
    location_type: LocationType | None
    name: str
    code: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)
