"""Email service: direct SMTP sending and IMAP inbox reading.

Replaces the external Rust email-api microservice.
"""

import logging
from datetime import datetime
from email.header import decode_header, make_header
from email.message import EmailMessage
from typing import Optional

import aiosmtplib
from imapclient import IMAPClient  # type: ignore
from pydantic import BaseModel, Field

from bbe2.config import Settings
from bbe2.utils.correlation import CORRELATION_ID_HEADER, get_correlation_id

logger = logging.getLogger(__name__)


class OutgoingEmail(BaseModel):
    """A single outgoing email with rendered content."""

    to: str
    subject: str
    body_html: str
    body_text: str


class InboxEmail(BaseModel):
    """An email from the inbox (headers only)."""

    subject: str
    datetime: datetime
    from_: Optional[str] = Field(None, serialization_alias="from")

    model_config = {"populate_by_name": True}


async def send_emails(
    settings: Settings,
    emails: list[OutgoingEmail],
) -> None:
    """Send a batch of emails via SMTP."""
    if settings.email_dry_run:
        logger.warning("Email dry_run enabled — not sending %d email(s).", len(emails))
        for email in emails:
            logger.info("  Would send to=%s subject=%s", email.to, email.subject)
        return

    # Build messages
    correlation_id = get_correlation_id()
    messages: list[EmailMessage] = []
    for email_data in emails:
        msg = EmailMessage()
        msg["From"] = settings.email_from
        msg["To"] = email_data.to
        msg["Subject"] = email_data.subject
        # Correlation header lets consumers (e.g. E2E tests) locate the exact
        # email a request produced. The value is already validated upstream
        # (strict charset), so it is safe against CRLF/header injection.
        if correlation_id:
            msg[CORRELATION_ID_HEADER] = correlation_id

        # Set plain text body and HTML alternative
        msg.set_content(email_data.body_text)
        msg.add_alternative(email_data.body_html, subtype="html")

        messages.append(msg)

    # Send all messages
    smtp_kwargs: dict = {
        "hostname": settings.smtp_host,
        "port": settings.smtp_port,
    }
    if settings.smtp_username and settings.smtp_password:
        smtp_kwargs["username"] = settings.smtp_username
        smtp_kwargs["password"] = settings.smtp_password
    if settings.smtp_use_tls:
        smtp_kwargs["use_tls"] = True

    for msg in messages:
        try:
            await aiosmtplib.send(msg, **smtp_kwargs)
            logger.info("Email sent to %s: %s", msg["To"], msg["Subject"])
        except aiosmtplib.SMTPException as e:
            logger.error("Failed to send email to %s: %s", msg["To"], e)
            raise


def _decode_mime_header(raw: Optional[bytes]) -> str:
    """Decode an RFC 2047 encoded-word header (e.g. ``=?utf-8?B?...?=``).

    Handles Base64 (``B``) and Quoted-Printable (``Q``) encodings, multiple
    concatenated encoded-words, and mixed charsets. Falls back to a UTF-8
    replacement decode if the header is malformed.
    """
    if not raw:
        return ""
    try:
        # decode_header accepts str; make_header re-assembles the parts into
        # a single unicode string, decoding each encoded-word by its charset.
        return str(make_header(decode_header(raw.decode("utf-8", errors="replace"))))
    except (ValueError, UnicodeDecodeError):
        return raw.decode("utf-8", errors="replace")


def fetch_inbox_emails(settings: Settings) -> list[InboxEmail]:
    """Fetch unseen emails from IMAP inbox (headers only)."""
    if not settings.imap_username or not settings.imap_password:
        logger.error("IMAP credentials not configured.")
        return []

    with IMAPClient(
        host=settings.imap_host,
        port=settings.imap_port,
        ssl=True,
    ) as client:
        client.login(settings.imap_username, settings.imap_password)
        client.select_folder("INBOX", readonly=True)

        # Search for unseen messages
        uids = client.search("UNSEEN")
        if not uids:
            return []

        # Fetch headers only
        messages = client.fetch(uids, ["ENVELOPE"])

        results: list[InboxEmail] = []
        for _uid, data in messages.items():  # type: ignore[union-attr]
            envelope = data[b"ENVELOPE"]  # type: ignore[index]
            subject = _decode_mime_header(getattr(envelope, "subject", None))
            date: datetime = getattr(envelope, "date", None) or datetime.now()

            # Extract from address
            from_name: Optional[str] = None
            from_addrs = getattr(envelope, "from_", None)
            if from_addrs:
                addr = from_addrs[0]
                if getattr(addr, "name", None):
                    from_name = _decode_mime_header(addr.name)
                elif getattr(addr, "mailbox", None):
                    from_name = f"{addr.mailbox.decode()}@{addr.host.decode()}"

            results.append(
                InboxEmail(
                    subject=subject,
                    datetime=date,
                    from_=from_name,
                )
            )

        return results
