from pathlib import Path

from app.core.config import settings

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


def get_upload_dir() -> Path:
    """Resolves settings.upload_dir. A relative path (the local-dev default,
    "uploads") is resolved under the backend root, same as before. An absolute
    path lets a Render Persistent Disk (or any other mount point) be used in
    production without code changes."""
    configured = Path(settings.upload_dir)
    upload_dir = configured if configured.is_absolute() else BACKEND_ROOT / configured
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir
