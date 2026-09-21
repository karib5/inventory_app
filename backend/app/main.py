from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import admin, auth, inventory, locations, products, transfers, uploads, warehouses
from app.core.config import settings
from app.core.paths import get_upload_dir
from app.db.migrate import reconcile_orphaned_location_stock, run_additive_migrations
from app.db.session import Base, engine

# Temporary development bootstrap. We will replace this with Alembic migrations before production.
Base.metadata.create_all(bind=engine)
run_additive_migrations(engine)
reconcile_orphaned_location_stock(engine)

app = FastAPI(title="Inventory Management API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=get_upload_dir()), name="uploads")


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(warehouses.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(transfers.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
