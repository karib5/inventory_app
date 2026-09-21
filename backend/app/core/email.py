"""Outbound email, kept deliberately thin: one function, `send_email`,
that every caller uses the same way regardless of what client triggered
it (browser, desktop app, or mobile app all hit the same JSON API, which
is the only thing that ever calls this). When SMTP isn't configured -
the default in this sandbox and in any fresh checkout - the message is
logged instead of sent, so the forgot-password flow is fully exercisable
end to end without real credentials. Set the smtp_* settings (via env
vars or .env) to send for real; any standard SMTP provider works, since
this uses only the stdlib smtplib rather than a vendor-specific SDK.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("app.email")


def send_email(to: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        logger.info(
            "SMTP not configured - logging email instead of sending it.\n"
            "  To: %s\n  Subject: %s\n  Body:\n%s",
            to,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_address}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
        if settings.smtp_use_tls:
            client.starttls()
        if settings.smtp_user and settings.smtp_password:
            client.login(settings.smtp_user, settings.smtp_password)
        client.send_message(message)
