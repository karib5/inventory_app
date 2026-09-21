from sqlalchemy import select, update

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models import Product, Role, User

Base.metadata.create_all(bind=engine)

# The configured bootstrap admin email has changed before (a brief
# admin@gmail.com experiment that was reverted back to admin@example.com).
# If a database has a super_admin under any address this project has ever
# used as the default, rename that row in place (same id, role, password)
# to match the currently configured email - never create a second admin
# just because the default changed again.
KNOWN_PAST_ADMIN_EMAILS = ["admin@example.com", "admin@gmail.com"]

with SessionLocal() as db:
    if db.scalar(select(User).where(User.email == settings.seed_admin_email)):
        print("Bootstrap admin already exists.")
    else:
        legacy = db.scalar(
            select(User).where(
                User.email.in_(KNOWN_PAST_ADMIN_EMAILS),
                User.role == Role.SUPER_ADMIN,
            )
        )
        if legacy:
            old_email = legacy.email
            legacy.email = settings.seed_admin_email
            db.commit()
            print(f"Renamed existing super admin {old_email} -> {settings.seed_admin_email}")
        else:
            admin = User(
                name="System Owner",
                email=settings.seed_admin_email,
                password_hash=hash_password(settings.seed_admin_password),
                role=Role.SUPER_ADMIN,
                company_id=None,
            )
            db.add(admin)
            db.commit()
            print(f"Created super admin: {settings.seed_admin_email}")

    # One-time data repair: minimum_stock_level's default changed from 0 to
    # 10. Products created before this change are still at 0 (the old
    # default), which made the low-stock check meaningless for them - bring
    # them up to the new default. Safe to re-run, but note it will also
    # reset any product a user has since deliberately set to 0 back to 10.
    result = db.execute(update(Product).where(Product.minimum_stock_level == 0).values(minimum_stock_level=10))
    db.commit()
    if result.rowcount:
        print(f"Set minimum_stock_level = 10 for {result.rowcount} existing product(s) that had no threshold.")
