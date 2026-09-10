"""Tests for Settings-derived properties."""

from tests.conftest import get_fake_settings


def test_email_from_assembles_name_and_address_defaults():
    settings = get_fake_settings()
    # Defaults from config.py.
    assert settings.email_from_name == "Bagad Men Ru"
    assert settings.email_from_address == "contact@bagadmenru.bzh"
    assert settings.email_from == "Bagad Men Ru <contact@bagadmenru.bzh>"


def test_email_from_quotes_name_with_special_characters():
    settings = get_fake_settings()
    settings.email_from_name = "Bagad, Men Ru"
    # formataddr quotes a display name containing a comma.
    assert settings.email_from == '"Bagad, Men Ru" <contact@bagadmenru.bzh>'
