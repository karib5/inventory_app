from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models import Company, Role, User

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    if db.scalar(select(User).where(User.email == settings.seed_admin_email)):
        print("Bootstrap admin already exists.")
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
