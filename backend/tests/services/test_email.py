"""Unit tests for the email service helpers."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from bbe2.services.email import (
    EmailAttachment,
    OutgoingEmail,
    _decode_mime_header,
    send_emails,
)
from bbe2.utils.correlation import CORRELATION_ID_HEADER, set_correlation_id


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        # Real-world example: Base64 encoded-word + Quoted-Printable encoded-word.
        (
            b"=?utf-8?B?UkU6IERpc3BvbmliaWxpdMOpIGV0IHRhcmlmcyAtIDUgT2N0b2JyZSAyMDI2?="
            b" =?utf-8?Q?_-_Paimpont?=",
            "RE: Disponibilité et tarifs - 5 Octobre 2026 - Paimpont",
        ),
        # Single Base64 encoded-word.
        (b"=?utf-8?B?RGlzcG9uaWJpbGl0w6k=?=", "Disponibilité"),
        # Quoted-Printable: underscore is a space, =XX are bytes.
        (b"=?utf-8?Q?Caf=C3=A9_du_coin?=", "Café du coin"),
        # Plain ASCII passes through unchanged.
        (b"Plain subject", "Plain subject"),
        # ISO-8859-1 charset is honoured.
        (b"=?iso-8859-1?Q?R=E9union?=", "Réunion"),
        # Empty / missing header yields empty string.
        (b"", ""),
        (None, ""),
    ],
)
def test_decode_mime_header(raw, expected):
    assert _decode_mime_header(raw) == expected


def test_decode_mime_header_malformed_falls_back():
    """A malformed encoded-word must not raise; it falls back to a raw decode."""
    raw = b"=?utf-8?B?not-valid-base64??="
    # Should return a string without raising.
    assert isinstance(_decode_mime_header(raw), str)


class _FakeSettings:
    """Minimal stand-in for Settings covering what send_emails reads."""

    email_dry_run = False
    email_from = "noreply@example.test"
    smtp_host = "smtp.example.test"
    smtp_port = 25
    smtp_username = None
    smtp_password = None
    smtp_use_tls = False


def test_send_emails_stamps_correlation_header():
    """The current correlation ID must be added as an email header."""
    set_correlation_id("abc12345")
    sent = []

    async def _fake_send(msg, **_kwargs):
        sent.append(msg)

    with patch(
        "bbe2.services.email.aiosmtplib.send", new=AsyncMock(side_effect=_fake_send)
    ):
        asyncio.run(
            send_emails(
                _FakeSettings(),
                [
                    OutgoingEmail(
                        to="a@b.test",
                        subject="Hi",
                        body_html="<p>x</p>",
                        body_text="x",
                    )
                ],
            )
        )

    assert len(sent) == 1
    assert sent[0][CORRELATION_ID_HEADER] == "abc12345"


def test_send_emails_without_correlation_id_omits_header():
    """When no correlation ID is set, no correlation header is added."""
    from bbe2.utils.correlation import _correlation_id_ctx  # type: ignore

    token = _correlation_id_ctx.set(None)
    sent = []

    async def _fake_send(msg, **_kwargs):
        sent.append(msg)

    try:
        with patch(
            "bbe2.services.email.aiosmtplib.send",
            new=AsyncMock(side_effect=_fake_send),
        ):
            asyncio.run(
                send_emails(
                    _FakeSettings(),
                    [
                        OutgoingEmail(
                            to="a@b.test",
                            subject="Hi",
                            body_html="<p>x</p>",
                            body_text="x",
                        )
                    ],
                )
            )
    finally:
        _correlation_id_ctx.reset(token)

    assert len(sent) == 1
    assert CORRELATION_ID_HEADER not in sent[0]


def test_send_emails_attaches_calendar_invitation():
    """An attachment is added as a text/calendar part carrying method=REQUEST."""
    sent = []

    async def _fake_send(msg, **_kwargs):
        sent.append(msg)

    with patch(
        "bbe2.services.email.aiosmtplib.send", new=AsyncMock(side_effect=_fake_send)
    ):
        asyncio.run(
            send_emails(
                _FakeSettings(),
                [
                    OutgoingEmail(
                        to="a@b.test",
                        subject="Hi",
                        body_html="<p>x</p>",
                        body_text="x",
                        attachments=[
                            EmailAttachment(
                                filename="invitation.ics",
                                content="BEGIN:VCALENDAR\nEND:VCALENDAR\n",
                                maintype="text",
                                subtype="calendar",
                                params={"method": "REQUEST", "charset": "UTF-8"},
                            )
                        ],
                    )
                ],
            )
        )

    assert len(sent) == 1
    calendar_parts = [
        p for p in sent[0].walk() if p.get_content_type() == "text/calendar"
    ]
    assert len(calendar_parts) == 1
    part = calendar_parts[0]
    assert part.get_param("method") == "REQUEST"
    assert part.get_filename() == "invitation.ics"
    assert b"BEGIN:VCALENDAR" in part.get_payload(decode=True)
