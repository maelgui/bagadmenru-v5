"""Unit tests for the email service helpers."""

import pytest

from bbe2.services.email import _decode_mime_header


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
