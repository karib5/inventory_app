from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import authorize_company_delete, get_current_user, require_company_user
from app.core.security import verify_password
from app.db.session import get_db
from app.models import InventoryTransaction, Location, Product, ProductStock, Role, User
from app.schemas.auth import DeleteResult, PasswordConfirm
from app.schemas.product import ProductCreate, ProductRead, ProductStockLocationRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=list[ProductRead])
def list_products(current_user: User = Depends(require_company_user), db: Session = Depends(get_db)):
    products = db.scalars(
        select(Product)
        .where(Product.company_id == current_user.company_id, Product.is_active.is_(True))
        .order_by(Product.id)
    ).all()

    # One batched query for every product's location breakdown, instead of
    # the frontend fetching each product's /stock one at a time (N+1).
    stock_rows = db.scalars(
        select(ProductStock)
        .join(Location, Location.id == ProductStock.location_id)
        .where(
            ProductStock.company_id == current_user.company_id,
            Location.is_active.is_(True),
            ProductStock.quantity > 0,
        )
        .order_by(ProductStock.location_id)
    ).all()
    stock_by_product: dict[int, list[ProductStockLocationRead]] = {}
    for row in stock_rows:
        stock_by_product.setdefault(row.product_id, []).append(
            ProductStockLocationRead(
                location_id=row.location.id,
                location_code=row.location.code,
                location_name=row.location.name,
                warehouse_id=row.location.warehouse_id,
                warehouse_name=row.location.warehouse.name if row.location.warehouse else None,
                path=_location_path(row.location),
                quantity=row.quantity,
            )
        )

    result = []
    for product in products:
        read = ProductRead.model_validate(product)
        read.stock_locations = stock_by_product.get(product.id, [])
        result.append(read)
    return result


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


@router.post("/{product_id}/confirm-delete", response_model=DeleteResult)
def confirm_delete_product(
    product_id: int,
    payload: PasswordConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Password-gated deletion. A product with no stock history and no live
    stock is removed outright; one that has either - any past transaction,
    or stock still sitting at an active location right now (e.g. it was
    created with an initial quantity but never moved, so there's no
    transaction to find) - is archived instead: is_active is set to False so
    it drops out of the normal catalog, but its rows and every
    InventoryTransaction that references it are left completely intact."""
    product = db.scalar(select(Product).where(Product.id == product_id))
    if not product:
        raise HTTPException(404, "Product not found")
    authorize_company_delete(current_user, product.company_id)

    if not verify_password(payload.password, current_user.password_hash):
        # 400, not 401: the frontend's global API wrapper treats any 401 on a
        # token-bearing request as "your session expired" and force-logs the
        # user out (see api.ts) - a wrong confirmation password must surface
        # as a normal in-modal error instead, not sign the admin out.
        raise HTTPException(400, "Incorrect password")

    has_history = bool(
        db.scalar(select(InventoryTransaction.id).where(InventoryTransaction.product_id == product_id).limit(1))
        or db.scalar(
            select(ProductStock.id)
            .join(Location, Location.id == ProductStock.location_id)
            .where(ProductStock.product_id == product_id, Location.is_active.is_(True), ProductStock.quantity > 0)
            .limit(1)
        )
    )
    if has_history:
        product.is_active = False
        db.commit()
        return DeleteResult(
            result="archived",
            message=f'"{product.name}" has inventory history, so it was archived instead of deleted - it no '
            "longer appears in your catalog, and its stock history is preserved.",
        )

    product_name = product.name
    db.execute(delete(ProductStock).where(ProductStock.product_id == product_id))
    db.delete(product)
    db.commit()
    return DeleteResult(result="deleted", message=f'"{product_name}" was permanently deleted.')


def _location_path(location: Location) -> list[str]:
    names: list[str] = []
    node: Location | None = location
    while node is not None:
        names.append(node.name)
        node = node.parent
    names.reverse()
    if location.warehouse:
        names = [location.warehouse.name] + names
    return names


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
        .join(Location, Location.id == ProductStock.location_id)
        .where(ProductStock.product_id == product_id, Location.is_active.is_(True), ProductStock.quantity > 0)
        .order_by(ProductStock.location_id)
    ).all()
    return [
        ProductStockLocationRead(
            location_id=row.location.id,
            location_code=row.location.code,
            location_name=row.location.name,
            warehouse_id=row.location.warehouse_id,
            warehouse_name=row.location.warehouse.name if row.location.warehouse else None,
            path=_location_path(row.location),
            quantity=row.quantity,
        )
        for row in rows
    ]
