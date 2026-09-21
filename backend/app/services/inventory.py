from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models import (
    InventoryTransaction,
    Location,
    Product,
    ProductStock,
    StockTransfer,
    TransactionType,
    User,
)


def _get_or_create_stock(db: Session, product: Product, location_id: int) -> ProductStock:
    """Returns the (locked) ProductStock row for this product/location, creating it
    first if needed. A brand-new row for the product's current "home" location
    (product.location_id) is seeded with the product's existing total quantity,
    since that's where all of its stock has implicitly lived until now; any other
    location starts at zero."""
    stmt = pg_insert(ProductStock).values(
        company_id=product.company_id,
        product_id=product.id,
        location_id=location_id,
        quantity=product.quantity if location_id == product.location_id else 0,
    ).on_conflict_do_nothing(index_elements=["product_id", "location_id"])
    db.execute(stmt)

    stock = db.scalar(
        select(ProductStock)
        .where(ProductStock.product_id == product.id, ProductStock.location_id == location_id)
        .with_for_update()
    )
    if stock is None:
        raise HTTPException(500, "Failed to initialize stock record")
    return stock


def _get_company_location(db: Session, company_id: int, location_id: int) -> Location:
    location = db.scalar(
        select(Location).where(Location.id == location_id, Location.company_id == company_id)
    )
    if not location:
        raise HTTPException(404, "Location not found")
    return location


def apply_stock_change(
    db: Session,
    company_id: int,
    product_id: int,
    user: User,
    change: int,
    type_: TransactionType,
    note: str | None,
    location_id: int | None = None,
) -> tuple[Product, InventoryTransaction]:
    """Locks the product row for the duration of this DB transaction so concurrent
    stock-in/out/adjust requests for the same product apply one after another
    instead of racing on a stale quantity. When a location is given (or the product
    already has a home location), the matching ProductStock row is kept in sync too."""
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id, Product.company_id == company_id)
        .with_for_update()
    )
    if not product:
        raise HTTPException(404, "Product not found")

    previous_quantity = product.quantity
    new_quantity = previous_quantity + change
    if new_quantity < 0:
        raise HTTPException(400, "Insufficient stock for this operation")
    product.quantity = new_quantity

    effective_location_id = location_id if location_id is not None else product.location_id
    if effective_location_id is not None:
        location = _get_company_location(db, company_id, effective_location_id)
        if change > 0 and not location.is_active:
            raise HTTPException(400, "Cannot add stock to a deactivated location")
        stock = _get_or_create_stock(db, product, effective_location_id)
        stock_new = stock.quantity + change
        if stock_new < 0:
            raise HTTPException(400, "Insufficient stock at this location")
        stock.quantity = stock_new

    transaction = InventoryTransaction(
        company_id=company_id,
        product_id=product.id,
        location_id=effective_location_id,
        user_id=user.id,
        type=type_,
        quantity_change=change,
        previous_quantity=previous_quantity,
        new_quantity=new_quantity,
        note=note,
    )
    db.add(transaction)
    db.commit()
    db.refresh(product)
    db.refresh(transaction)
    return product, transaction


def transfer_stock(
    db: Session,
    company_id: int,
    product_id: int,
    from_location_id: int,
    to_location_id: int,
    quantity: int,
    user: User,
    note: str | None,
) -> tuple[StockTransfer, InventoryTransaction, InventoryTransaction]:
    """Moves stock between two locations for the same product. The product's total
    quantity is unchanged (nothing enters or leaves the company); only the
    per-location ProductStock rows move. Both ends are locked in a fixed order
    (ascending location id) so two concurrent transfers between the same pair of
    locations can never deadlock each other."""
    if from_location_id == to_location_id:
        raise HTTPException(400, "Source and destination locations must be different")

    product = db.scalar(
        select(Product).where(Product.id == product_id, Product.company_id == company_id)
    )
    if not product:
        raise HTTPException(404, "Product not found")

    _get_company_location(db, company_id, from_location_id)
    to_location = _get_company_location(db, company_id, to_location_id)
    if not to_location.is_active:
        raise HTTPException(400, "Cannot transfer stock into a deactivated location")

    first_id, second_id = sorted([from_location_id, to_location_id])
    stock_by_location = {
        first_id: _get_or_create_stock(db, product, first_id),
        second_id: _get_or_create_stock(db, product, second_id),
    }
    source_stock = stock_by_location[from_location_id]
    dest_stock = stock_by_location[to_location_id]

    if source_stock.quantity < quantity:
        raise HTTPException(400, "Insufficient stock at the source location")

    source_previous = source_stock.quantity
    source_stock.quantity -= quantity
    dest_previous = dest_stock.quantity
    dest_stock.quantity += quantity

    transfer = StockTransfer(
        company_id=company_id,
        reference="",
        product_id=product.id,
        quantity=quantity,
        from_location_id=from_location_id,
        to_location_id=to_location_id,
        user_id=user.id,
        note=note,
    )
    db.add(transfer)
    db.flush()
    transfer.reference = f"TRF-{transfer.id:06d}"

    out_transaction = InventoryTransaction(
        company_id=company_id,
        product_id=product.id,
        location_id=from_location_id,
        transfer_id=transfer.id,
        user_id=user.id,
        type=TransactionType.TRANSFER_OUT,
        quantity_change=-quantity,
        previous_quantity=source_previous,
        new_quantity=source_stock.quantity,
        note=note,
    )
    in_transaction = InventoryTransaction(
        company_id=company_id,
        product_id=product.id,
        location_id=to_location_id,
        transfer_id=transfer.id,
        user_id=user.id,
        type=TransactionType.TRANSFER_IN,
        quantity_change=quantity,
        previous_quantity=dest_previous,
        new_quantity=dest_stock.quantity,
        note=note,
    )
    db.add_all([out_transaction, in_transaction])
    db.commit()
    db.refresh(transfer)
    db.refresh(out_transaction)
    db.refresh(in_transaction)
    return transfer, out_transaction, in_transaction
