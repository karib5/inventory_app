import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.api.deps import require_company_user
from app.core.paths import get_upload_dir
from app.models import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_SIZE_BYTES = 5 * 1024 * 1024


@router.post("")
async def upload_image(
    file: UploadFile,
    _: User = Depends(require_company_user),
):
    extension = ALLOWED_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(400, "Only JPEG, PNG, WEBP, or GIF images are allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(400, "Image must be smaller than 5MB")

    filename = f"{uuid.uuid4().hex}{extension}"
    (get_upload_dir() / filename).write_bytes(contents)

    return {"url": f"/uploads/{filename}"}
