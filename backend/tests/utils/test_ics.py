"""Unit tests for the iCalendar invitation builder."""

from datetime import datetime

from bbe2.utils.ics import build_event_invite_ics, event_uid


def _build() -> str:
    return build_event_invite_ics(
        event_id=42,
        title="Répétition",
        description="Salle des fêtes",
        begin=datetime(2026, 9, 10, 20, 0, 0),
        organizer_email="contact@bagadmenru.bzh",
        organizer_name="Bagad Men Ru",
        attendee_email="jean@example.org",
        attendee_name="Jean Dupont",
        domain="prod.bagadmenru.bzh",
    )


def test_event_uid_is_stable_and_scoped():
    assert event_uid(42, "prod.bagadmenru.bzh") == "event-42@prod.bagadmenru.bzh"
    # Same id + domain always yields the same UID (so clients update, not dup).
    assert event_uid(42, "prod.bagadmenru.bzh") == event_uid(42, "prod.bagadmenru.bzh")


def test_invite_is_a_request_method():
    ics = _build()
    assert "BEGIN:VCALENDAR" in ics
    assert "METHOD:REQUEST" in ics


def test_invite_carries_stable_uid():
    assert "UID:event-42@prod.bagadmenru.bzh" in _build()


def test_invite_lists_recipient_as_attendee_needs_action():
    ics = _build()
    assert "ATTENDEE" in ics
    assert "PARTSTAT=NEEDS-ACTION" in ics
    assert "mailto:jean@example.org" in ics
    assert "CN=Jean Dupont" in ics


def test_invite_has_organizer():
    ics = _build()
    assert "ORGANIZER" in ics
    assert "mailto:contact@bagadmenru.bzh" in ics


def test_invite_includes_title_and_description():
    ics = _build()
    # ics may fold/escape lines, so assert on the significant tokens.
    assert "SUMMARY:R" in ics  # "Répétition"
    assert "Salle des f" in ics  # "Salle des fêtes"
