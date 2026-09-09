"""Build iCalendar (RFC 5545) payloads for outgoing emails.

The event-creation email carries a per-recipient iTIP invitation
(:rfc:`5546`, ``METHOD:REQUEST``) so a member can add the event to their own
calendar with one click, with themselves listed as the ATTENDEE.

Note: this is sent at event *creation*, before anyone has responded, so the
attendee's participation status is always ``NEEDS-ACTION`` here. Reflecting an
actual presence in the title belongs to the per-user subscription feed, not to
this invitation.
"""

from datetime import date, datetime

from ics import Attendee, Calendar, Event, Organizer  # type: ignore


def event_uid(event_id: int, domain: str) -> str:
    """Stable UID for an event, so calendar clients update instead of duplicate.

    The UID must not change between sends for the same event; deriving it from
    the database id guarantees that.
    """
    return f"event-{event_id}@{domain}"


def build_event_invite_ics(
    *,
    event_id: int,
    title: str,
    description: str,
    begin: date | datetime,
    organizer_email: str,
    organizer_name: str,
    attendee_email: str,
    attendee_name: str,
    domain: str,
) -> str:
    """Serialize a single-event ``METHOD:REQUEST`` calendar for one recipient.

    Each recipient gets their own calendar because they appear as the ATTENDEE.
    """
    calendar = Calendar()
    calendar.method = "REQUEST"

    event = Event()
    event.uid = event_uid(event_id, domain)
    event.name = title
    event.description = description
    event.begin = begin
    event.make_all_day()
    event.organizer = Organizer(email=organizer_email, common_name=organizer_name)
    event.add_attendee(
        Attendee(
            email=attendee_email,
            common_name=attendee_name,
            partstat="NEEDS-ACTION",
            role="REQ-PARTICIPANT",
        )
    )
    calendar.events.add(event)

    return calendar.serialize()
