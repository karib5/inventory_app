from pydantic import BaseModel, Field

from app.models import Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: Role
    company_id: int | None
    is_active: bool


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Role = Role.STAFF
    company_id: int | None = None


class PasswordConfirm(BaseModel):
    """Body for a destructive action that requires re-entering the
    currently authenticated user's own password, verified server-side."""

    password: str


class DeleteResult(BaseModel):
    result: str  # "deleted" | "archived"
    message: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str = Field(min_length=8)


class AuthMessageResult(BaseModel):
    message: str
