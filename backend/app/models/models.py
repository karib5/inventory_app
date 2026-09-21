from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    COMPANY_ADMIN = "company_admin"
    MANAGER = "manager"
    STAFF = "staff"


class TransactionType(str, Enum):
    STOCK_IN = "stock_in"
    STOCK_OUT = "stock_out"
    ADJUSTMENT = "adjustment"
    TRANSFER_OUT = "transfer_out"
    TRANSFER_IN = "transfer_in"


class LocationType(str, Enum):
    ZONE = "zone"
    AISLE = "aisle"
    RACK = "rack"
    SHELF = "shelf"
    BIN = "bin"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    users: Mapped[list["User"]] = relationship(back_populates="company")
    locations: Mapped[list["Location"]] = relationship(back_populates="company")
    products: Mapped[list["Product"]] = relationship(back_populates="company")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(String(30), default=Role.STAFF, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    company: Mapped[Company | None] = relationship(back_populates="users")


class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_warehouse_company_code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # is_active is the plain on/off toggle a manager flips by hand (Activate/
    # Deactivate) - unrelated to deletion. is_archived is a separate, only
    # system-set flag: it's true only when Delete Warehouse found real
    # history it couldn't destroy, so it archived the warehouse instead.
    # Kept apart from is_active so "I turned this off for a while" and "this
    # was archived because it couldn't be deleted" are never the same state
    # - an archived warehouse is hidden from the main list entirely, an
    # inactive-but-not-archived one still shows there, just marked Inactive.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    company: Mapped[Company] = relationship()
    locations: Mapped[list["Location"]] = relationship(back_populates="warehouse")


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_location_company_code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    warehouse_id: Mapped[int | None] = mapped_column(ForeignKey("warehouses.id"), nullable=True, index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True, index=True)
    location_type: Mapped[LocationType | None] = mapped_column(String(20), nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Visual warehouse builder metadata. position_x/position_y are grid-cell
    # indices (not pixels) among siblings sharing the same parent - that
    # makes "no overlapping racks" and "snap into position" a property of
    # the grid itself rather than something that needs collision math.
    # capacity is reused by role: on an Area, the max number of direct rack
    # children it accepts; on a Shelf, its unit storage capacity. Unused
    # (None) on other location types.
    position_x: Mapped[int | None] = mapped_column(Integer, nullable=True)
    position_y: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    company: Mapped[Company] = relationship(back_populates="locations")
    warehouse: Mapped[Warehouse | None] = relationship(back_populates="locations")
    parent: Mapped["Location | None"] = relationship(remote_side="Location.id", back_populates="children")
    children: Mapped[list["Location"]] = relationship(back_populates="parent")
    products: Mapped[list["Product"]] = relationship(back_populates="location")
    stocks: Mapped[list["ProductStock"]] = relationship(back_populates="location")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("company_id", "sku", name="uq_product_company_sku"),
        UniqueConstraint("company_id", "barcode", name="uq_product_company_barcode"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True)
    sku: Mapped[str] = mapped_column(String(80), index=True)
    barcode: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    minimum_stock_level: Mapped[int] = mapped_column(Integer, default=10)
    # False means "archived": hidden from the normal catalog but its rows
    # (and every transaction that references it) are kept intact. Used
    # instead of a hard delete once a product has inventory history.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    company: Mapped[Company] = relationship(back_populates="products")
    location: Mapped[Location | None] = relationship(back_populates="products")
    transactions: Mapped[list["InventoryTransaction"]] = relationship(back_populates="product")
    stocks: Mapped[list["ProductStock"]] = relationship(back_populates="product")


class ProductStock(Base):
    """Per-location stock ledger. Product.quantity remains a cached total (the sum of
    these rows) so existing code that only knows about Product.quantity keeps working
    unchanged; this table is the source of truth once a product's stock is split
    across more than one location (e.g. after a transfer)."""

    __tablename__ = "product_stocks"
    __table_args__ = (UniqueConstraint("product_id", "location_id", name="uq_stock_product_location"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    company: Mapped[Company] = relationship()
    product: Mapped[Product] = relationship(back_populates="stocks")
    location: Mapped[Location] = relationship(back_populates="stocks")


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    reference: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    from_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
    to_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    company: Mapped[Company] = relationship()
    product: Mapped[Product] = relationship()
    from_location: Mapped[Location] = relationship(foreign_keys=[from_location_id])
    to_location: Mapped[Location] = relationship(foreign_keys=[to_location_id])
    user: Mapped["User"] = relationship()


class InventoryTransaction(Base):
    """previous_quantity/new_quantity are the product's total quantity for stock_in,
    stock_out and adjustment rows; for transfer_out/transfer_in rows they are the
    stock level at `location_id` instead, since a transfer never changes the
    product's total."""

    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), nullable=True, index=True)
    transfer_id: Mapped[int | None] = mapped_column(ForeignKey("stock_transfers.id"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[TransactionType] = mapped_column(String(20), index=True)
    quantity_change: Mapped[int] = mapped_column(Integer)
    previous_quantity: Mapped[int] = mapped_column(Integer)
    new_quantity: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    company: Mapped[Company] = relationship()
    product: Mapped[Product] = relationship(back_populates="transactions")
    location: Mapped[Location | None] = relationship()
    transfer: Mapped[StockTransfer | None] = relationship()
    user: Mapped["User"] = relationship()
