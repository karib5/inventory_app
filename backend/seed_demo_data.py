"""One-off demo data for a specific company (the one owned by the
ADMIN_EMAIL below): a warehouse with three "rooms" (locations), one
product per room, and a couple of real stock-in/stock-out transactions
per product - all applied through the same apply_stock_change() service
the API uses, so Product.quantity, ProductStock and InventoryTransaction
stay consistent exactly like a real stock movement would.

Safe to re-run: every step checks for an existing row (by company-scoped
code/SKU) before creating one, so it never duplicates locations,
products, or their initial transactions. Never deletes or overwrites
anything.

Usage (from backend/, with the venv active):
    python seed_demo_data.py
"""

from sqlalchemy import select

from app.core.security import verify_password
from app.db.session import Base, SessionLocal, engine
from app.models import Location, Product, TransactionType, User, Warehouse
from app.services.inventory import apply_stock_change

ADMIN_EMAIL = "arbd@admin.com"
ADMIN_PASSWORD = "11111111"

WAREHOUSE_CODE = "ARBD-WH"
WAREHOUSE_NAME = "Main Warehouse"

# (room code, room name, SKU, product name, description, minimum_stock,
#  initial stock-in, subsequent stock-out)
ROOMS_AND_PRODUCTS = [
    ("SHIRT-RM", "Shirt Room", "SHIRT-001", "Shirt", "Cotton crew neck, everyday wear", 20, 70, 10),
    ("SHOE-RM", "Shoe Room", "SHOE-001", "Shoe", "Comfortable running shoes, all sizes", 40, 50, 15),
    ("CAP-RM", "Cap Room", "CAP-001", "Cap", "Adjustable baseball cap, one size", 30, 96, 20),
]

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if not admin:
        raise SystemExit(f"No user found with email {ADMIN_EMAIL} - create that account first.")
    if not admin.company_id:
        raise SystemExit(f"{ADMIN_EMAIL} isn't attached to a company - can't seed company data for it.")
    if not verify_password(ADMIN_PASSWORD, admin.password_hash):
        print(f"Note: the password on file for {ADMIN_EMAIL} doesn't match {ADMIN_PASSWORD!r} - "
              "continuing anyway, this script only reads the account to find its company.")

    company_id = admin.company_id

    warehouse = db.scalar(select(Warehouse).where(Warehouse.company_id == company_id))
    if warehouse:
        print(f"Reusing existing warehouse: {warehouse.code} - {warehouse.name}")
    else:
        warehouse = Warehouse(company_id=company_id, code=WAREHOUSE_CODE, name=WAREHOUSE_NAME)
        db.add(warehouse)
        db.flush()
        print(f"Created warehouse: {warehouse.code} - {warehouse.name}")

    for room_code, room_name, sku, name, description, min_stock, stock_in, stock_out in ROOMS_AND_PRODUCTS:
        location = db.scalar(select(Location).where(Location.company_id == company_id, Location.code == room_code))
        if location:
            print(f"Reusing existing location: {location.code} - {location.name}")
        else:
            location = Location(
                company_id=company_id,
                warehouse_id=warehouse.id,
                name=room_name,
                code=room_code,
            )
            db.add(location)
            db.flush()
            print(f"Created location: {location.code} - {location.name}")

        product = db.scalar(select(Product).where(Product.company_id == company_id, Product.sku == sku))
        if product:
            print(f"Product {sku} already exists (qty {product.quantity}) - leaving it as-is.")
            continue

        product = Product(
            company_id=company_id,
            location_id=location.id,
            sku=sku,
            name=name,
            description=description,
            quantity=0,
            minimum_stock_level=min_stock,
        )
        db.add(product)
        db.flush()

        apply_stock_change(
            db, company_id, product.id, admin, stock_in, TransactionType.STOCK_IN,
            "Initial stock", location.id,
        )
        apply_stock_change(
            db, company_id, product.id, admin, -stock_out, TransactionType.STOCK_OUT,
            "Demo stock-out", location.id,
        )
        db.refresh(product)
        print(f"Created product {sku} ({name}) in {room_name}: {stock_in} in, {stock_out} out -> {product.quantity} on hand, min {min_stock}")

    print("\nDone.")
