"""Unit tests for correlation ID handling."""

import uuid

import pytest

from bbe2.utils.correlation import (
    generate_correlation_id,
    get_correlation_id,
    is_valid_correlation_id,
    resolve_correlation_id,
    set_correlation_id,
)


@pytest.mark.parametrize(
    "value",
    [
        uuid.uuid4().hex,
        "abcdefgh",  # exactly 8 chars, min length
        "A" * 64,  # exactly 64 chars, max length
        "trace-id_1.2",
    ],
)
def test_valid_ids_are_accepted(value):
    assert is_valid_correlation_id(value) is True


@pytest.mark.parametrize(
    "value",
    [
        "short",  # under 8 chars
        "A" * 65,  # over 64 chars
        "has space",
        "with\r\ncrlf",  # CRLF injection attempt
        "with\nnewline",
        "semi;colon",
        "slash/here",
        "",
    ],
)
def test_invalid_ids_are_rejected(value):
    assert is_valid_correlation_id(value) is False


def test_resolve_reuses_valid_incoming_id():
    incoming = uuid.uuid4().hex
    assert resolve_correlation_id(incoming) == incoming


def test_resolve_generates_when_missing():
    generated = resolve_correlation_id(None)
    assert is_valid_correlation_id(generated)


def test_resolve_generates_when_invalid():
    generated = resolve_correlation_id("bad\r\nvalue")
    assert generated != "bad\r\nvalue"
    assert is_valid_correlation_id(generated)


def test_generate_produces_valid_unique_ids():
    a = generate_correlation_id()
    b = generate_correlation_id()
    assert a != b
    assert is_valid_correlation_id(a)


def test_set_and_get_roundtrip():
    value = uuid.uuid4().hex
    set_correlation_id(value)
    assert get_correlation_id() == value
