from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)


class CompanyRead(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CompanyDetail(CompanyRead):
    user_count: int
    location_count: int
    product_count: int


class CompanyStatusUpdate(BaseModel):
    is_active: bool
