from collections.abc import Callable, Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_error
        user = db.scalar(select(User).where(User.id == int(user_id)))
    except (JWTError, ValueError, TypeError):
        raise credentials_error

    if not user or not user.is_active:
        raise credentials_error
    return user


def require_roles(*allowed_roles: Role) -> Callable:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return dependency


def require_company_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="A company account is required")
    return current_user


def authorize_company_delete(current_user: User, resource_company_id: int) -> None:
    """Gate for destructive, password-confirmed deletes (warehouses,
    products): only a super_admin, or the company_admin of the resource's
    own company, may proceed. Managers and staff never can, regardless of
    what they're otherwise allowed to create or edit - deletion is a
    separate, narrower permission than the existing company_admin+manager
    edit rules. A company_admin from a *different* company gets 404, same
    as every other company-scoped endpoint in this app - a resource
    outside your company doesn't just get a "forbidden", it doesn't
    exist to you."""
    if current_user.role == Role.SUPER_ADMIN:
        return
    if current_user.role != Role.COMPANY_ADMIN:
        raise HTTPException(status_code=403, detail="Only a company admin or super admin can delete this")
    if current_user.company_id != resource_company_id:
        raise HTTPException(status_code=404, detail="Not found")
