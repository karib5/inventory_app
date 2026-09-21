from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_company_user
from app.db.session import get_db
from app.models import Location, Product, ProductStock, Role, User
from app.schemas.product import ProductCreate, ProductRead, ProductStockLocationRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=list[ProductRead])
def list_products(current_user: User = Depends(require_company_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(Product).where(Product.company_id == current_user.company_id).order_by(Product.id)
    ).all()


@router.post("", response_model=ProductRead, status_code=201)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (Role.COMPANY_ADMIN, Role.MANAGER):
        raise HTTPException(403, "Only company admins and managers can create products")

    if db.scalar(select(Product).where(Product.company_id == current_user.company_id, Product.sku == payload.sku)):
        raise HTTPException(409, "SKU already exists")

    if payload.barcode and db.scalar(
        select(Product).where(Product.company_id == current_user.company_id, Product.barcode == payload.barcode)
    ):
        raise HTTPException(409, "Barcode already exists")

    if payload.location_id is not None and not db.scalar(
        select(Location).where(Location.id == payload.location_id, Location.company_id == current_user.company_id)
    ):
        raise HTTPException(400, "Location does not belong to this company")

    product = Product(company_id=current_user.company_id, **payload.model_dump())
    db.add(product)
    db.flush()

    if payload.location_id is not None and payload.quantity > 0:
        db.add(
            ProductStock(
                company_id=current_user.company_id,
                product_id=product.id,
                location_id=payload.location_id,
                quantity=payload.quantity,
            )
        )

    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    product = db.scalar(
        select(Product).where(Product.id == product_id, Product.company_id == current_user.company_id)
    )
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (Role.COMPANY_ADMIN, Role.MANAGER):
        raise HTTPException(403, "Only company admins and managers can edit products")

    product = db.scalar(
        select(Product).where(Product.id == product_id, Product.company_id == current_user.company_id)
    )
    if not product:
        raise HTTPException(404, "Product not found")

    updates = payload.model_dump(exclude_unset=True)
    if "barcode" in updates and updates["barcode"] and db.scalar(
        select(Product).where(
            Product.company_id == current_user.company_id,
            Product.barcode == updates["barcode"],
            Product.id != product_id,
        )
    ):
        raise HTTPException(409, "Barcode already exists")

    for field, value in updates.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}/stock", response_model=list[ProductStockLocationRead])
def get_product_stock_by_location(
    product_id: int,
    current_user: User = Depends(require_company_user),
    db: Session = Depends(get_db),
):
    product = db.scalar(
        select(Product).where(Product.id == product_id, Product.company_id == current_user.company_id)
    )
    if not product:
        raise HTTPException(404, "Product not found")

    rows = db.scalars(
        select(ProductStock)
        .where(ProductStock.product_id == product_id, ProductStock.quantity > 0)
        .order_by(ProductStock.location_id)
    ).all()
    return [
        ProductStockLocationRead(
            location_id=row.location.id,
            location_code=row.location.code,
            location_name=row.location.name,
            warehouse_id=row.location.warehouse_id,
            warehouse_name=row.location.warehouse.name if row.location.warehouse else None,
            quantity=row.quantity,
        )
        for row in rows
    ]
