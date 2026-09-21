from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_company_user, require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models import Company, Location, Product, Role, User
from app.schemas.auth import UserCreate, UserRead
from app.schemas.company import CompanyCreate, CompanyDetail, CompanyRead, CompanyStatusUpdate

router = APIRouter(prefix="/admin", tags=["Administration"])


def _get_company_or_404(db: Session, company_id: int) -> Company:
    company = db.scalar(select(Company).where(Company.id == company_id))
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@router.post("/companies", response_model=CompanyRead, status_code=201)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    if db.scalar(select(Company).where(Company.name == payload.name)):
        raise HTTPException(409, "Company already exists")
    company = Company(name=payload.name)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/companies", response_model=list[CompanyRead])
def list_companies(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    return db.scalars(select(Company).order_by(Company.id)).all()


@router.get("/companies/{company_id}", response_model=CompanyDetail)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    company = _get_company_or_404(db, company_id)
    user_count = db.scalar(select(func.count()).select_from(User).where(User.company_id == company_id))
    location_count = db.scalar(select(func.count()).select_from(Location).where(Location.company_id == company_id))
    product_count = db.scalar(select(func.count()).select_from(Product).where(Product.company_id == company_id))
    return CompanyDetail(
        id=company.id,
        name=company.name,
        is_active=company.is_active,
        created_at=company.created_at,
        user_count=user_count or 0,
        location_count=location_count or 0,
        product_count=product_count or 0,
    )


@router.patch("/companies/{company_id}", response_model=CompanyRead)
def update_company_status(
    company_id: int,
    payload: CompanyStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    company = _get_company_or_404(db, company_id)
    company.is_active = payload.is_active
    db.commit()
    db.refresh(company)
    return company


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.scalar(select(User).where(User.email == payload.email.lower().strip())):
        raise HTTPException(409, "Email already exists")

    if current_user.role == Role.SUPER_ADMIN:
        if payload.role != Role.SUPER_ADMIN and payload.company_id is None:
            raise HTTPException(400, "A company_id is required for company users")
        company_id = payload.company_id
    elif current_user.role == Role.COMPANY_ADMIN:
        if payload.role not in (Role.MANAGER, Role.STAFF):
            raise HTTPException(403, "Company admins can create managers or staff")
        company_id = current_user.company_id
    elif current_user.role == Role.MANAGER:
        if payload.role != Role.STAFF:
            raise HTTPException(403, "Managers can create staff only")
        company_id = current_user.company_id
    else:
        raise HTTPException(403, "Insufficient permissions")

    if company_id is not None:
        company = db.scalar(select(Company).where(Company.id == company_id))
        if not company:
            raise HTTPException(404, "Company not found")
        if not company.is_active:
            raise HTTPException(400, "Cannot add users to a deactivated company")

    user = User(
        name=payload.name,
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        company_id=company_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = select(User).order_by(User.id)
    if current_user.role != Role.SUPER_ADMIN:
        if current_user.company_id is None:
            return []
        query = query.where(User.company_id == current_user.company_id)
    return db.scalars(query).all()
