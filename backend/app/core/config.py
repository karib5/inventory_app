from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:5173"
    # Optional regex for origins that change on every run (e.g. Cloudflare
    # Quick Tunnel's random *.trycloudflare.com subdomain). Unused by the
    # normal Vite-proxy setup (same-origin), kept as a fallback.
    cors_origin_regex: str | None = None
    redis_url: str | None = None
    upload_dir: str = "uploads"
    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "ChangeMe123!"

    # Outbound email for the forgot-password flow. All optional: when unset,
    # app.core.email logs the message instead of sending it, so the flow is
    # fully testable without real credentials. Set these (any standard SMTP
    # provider - Postfix, SES, SendGrid, Mailgun, etc.) to send for real.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_address: str = "no-reply@inventory.local"
    smtp_from_name: str = "Inventory"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Render (and some other hosts) hand out connection strings as
        postgres:// or postgresql://, which makes SQLAlchemy default to the
        psycopg2 driver. Only psycopg (v3) is installed (see requirements.txt),
        so rewrite the scheme to use it explicitly unless a driver is already
        specified — this way it doesn't matter which form gets pasted into
        DATABASE_URL."""
        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://") :]
        if value.startswith("postgresql://"):
            value = "postgresql+psycopg://" + value[len("postgresql://") :]
        return value


settings = Settings()
