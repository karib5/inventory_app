import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.email import send_email
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import PasswordResetToken, User
from app.schemas.auth import (
    AuthMessageResult,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Unambiguous alphabet (no 0/O, 1/I/L) since the user has to read this off
# an email and type it back in, on any device including a phone keyboard.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LENGTH = 8
_CODE_TTL_MINUTES = 15
_REQUEST_COOLDOWN_SECONDS = 60
_MAX_ATTEMPTS = 5
_GENERIC_FORGOT_MESSAGE = (
    "If an account exists for that email, we've sent a password reset code to it."
)


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _generate_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


def _utcnow() -> datetime:
    # Naive UTC, matching every other timestamp column in this codebase
    # (all populated via server_default=func.now(), which is naive too) -
    # comparing an aware datetime against those would risk a silent
    # tz-conversion mismatch depending on the DB session's timezone.
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.scalar(select(User).where(User.email == form_data.username.lower().strip()))
    if not user or not user.is_active or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.company_id is not None and user.company is not None and not user.company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This company account has been deactivated",
        )
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", response_model=AuthMessageResult)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Always answers with the same message, whether or not the email
    belongs to an account - anything else (a different message, a
    different response time from actually sending mail) would let an
    attacker enumerate which emails have accounts here. Works identically
    for a staff account, a company_admin, or a super_admin: there is
    nothing role-specific about "I forgot my password"."""
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if not user:
        return AuthMessageResult(message=_GENERIC_FORGOT_MESSAGE)

    now = _utcnow()
    recent = db.scalar(
        select(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.created_at > now - timedelta(seconds=_REQUEST_COOLDOWN_SECONDS),
        )
        .order_by(PasswordResetToken.created_at.desc())
        .limit(1)
    )
    if recent:
        # A code was already sent moments ago - don't fire off another one
        # (and don't let repeated requests be used to spam the inbox), but
        # still answer identically so this can't be used to probe timing.
        return AuthMessageResult(message=_GENERIC_FORGOT_MESSAGE)

    # A fresh request supersedes anything still outstanding, so only ever
    # one code is valid for a user at a time.
    db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
        )
    )

    code = _generate_code()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            code_hash=_hash_code(code),
            expires_at=now + timedelta(minutes=_CODE_TTL_MINUTES),
        )
    )
    db.commit()

    send_email(
        user.email,
        "Your password reset code",
        f"Hi {user.name},\n\n"
        f"Your password reset code is: {code}\n\n"
        f"Enter it in the app along with your new password. It expires in "
        f"{_CODE_TTL_MINUTES} minutes and can only be used once.\n\n"
        "If you didn't request this, you can safely ignore this email - "
        "your password hasn't been changed.",
    )
    return AuthMessageResult(message=_GENERIC_FORGOT_MESSAGE)


@router.post("/reset-password", response_model=AuthMessageResult)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    invalid = HTTPException(status_code=400, detail="Invalid or expired code")

    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if not user:
        raise invalid

    now = _utcnow()
    token = db.scalar(
        select(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.created_at.desc())
        .limit(1)
    )
    if not token or token.attempts >= _MAX_ATTEMPTS:
        raise invalid

    submitted_hash = _hash_code(payload.code.strip().upper())
    if not hmac.compare_digest(submitted_hash, token.code_hash):
        token.attempts += 1
        db.commit()
        raise invalid

    user.password_hash = hash_password(payload.new_password)
    token.used_at = now
    # Any other outstanding codes for this user are no longer meaningful
    # once the password has actually changed. Excludes this token by id
    # (rather than relying on used_at.is_(None), which would still match
    # it here - this session is autoflush=False, so the used_at change
    # just above isn't visible to the DB yet when this statement runs).
    db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != token.id,
        )
    )
    db.commit()
    return AuthMessageResult(message="Password reset. You can now sign in with your new password.")
