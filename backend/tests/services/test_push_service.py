"""Tests for bbe2.services.push_service.

Covers per-user payload extras (RSVP tokens) and the ``receives_push`` master
switch: a user can hold device subscriptions but still turn off push globally
(``receives_push=False``), mirroring the ``receives_emails`` preference. When
off, no device of that user should be sent to, even though the subscription
rows still exist.
"""

import json
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.models.base import Base
from bbe2.schemas import Costume
from bbe2.services.push_service import (
    send_push_to_user,
    send_push_to_users,
    send_push_to_users_with_data,
)
from tests.conftest import get_fake_settings

DATABASE_URL = "sqlite:///tests_services_push.sqlite?check_same_thread=false"


def _settings():
    # Fake settings with VAPID keys set so _send_push proceeds to call webpush
    # (which the tests mock).
    settings = get_fake_settings()
    settings.vapid_private_key = "priv"
    settings.vapid_public_key = "pub"
    settings.vapid_claims_email = "mailto:test@example.com"
    return settings


def _session():
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_local()
    session.add(models.GroupDB(id=1, name="Piccolo", color="#fff"))
    session.commit()
    return session


def _user(user_id: str):
    return models.UserDB(
        id=user_id,
        email=f"{user_id}@example.com",
        first_name=user_id,
        last_name=user_id,
        instrument_id=1,
    )


def _subscription(user_id: str):
    return models.PushSubscriptionDB(
        user_id=user_id,
        endpoint=f"https://push.example.com/{user_id}",
        p256dh="p256dh",
        auth="auth",
    )


def _event(event_id: int):
    return models.EventDB(
        id=event_id,
        title=f"Event {event_id}",
        description="desc",
        date=datetime.now() + timedelta(days=5),
        costume=Costume.NONE,
        category="TEST",
        is_in_doodle=True,
    )


def _user_with_device(session, user_id: str, receives_push: bool):
    session.add(
        models.UserDB(
            id=user_id,
            email=f"{user_id}@example.com",
            first_name=user_id,
            last_name=user_id,
            instrument_id=1,
            receives_push=receives_push,
        )
    )
    session.add(
        models.PushSubscriptionDB(
            user_id=user_id,
            endpoint=f"https://push.example/{user_id}",
            p256dh="k",
            auth="a",
        )
    )
    session.commit()


def test_per_user_extras_merged_into_payload():
    with _session() as session:
        session.add(_user("alice"))
        session.add(_user("bob"))
        session.add(_subscription("alice"))
        session.add(_subscription("bob"))
        session.add(_event(42))
        session.commit()

        with patch("bbe2.services.push_service.webpush") as mock_webpush:
            send_push_to_users_with_data(
                session=session,
                settings=_settings(),
                title="Nouvelle sortie",
                body="desc",
                url="https://app.example.com/events",
                extra_by_user={
                    "alice": {"eventId": 42, "rsvpToken": "tok-alice"},
                    "bob": {"eventId": 42, "rsvpToken": "tok-bob"},
                },
            )

        # One push per subscription (one per user here).
        assert mock_webpush.call_count == 2

        payloads_by_endpoint = {
            call.kwargs["subscription_info"]["endpoint"]: json.loads(
                call.kwargs["data"]
            )
            for call in mock_webpush.call_args_list
        }

        alice = payloads_by_endpoint["https://push.example.com/alice"]
        bob = payloads_by_endpoint["https://push.example.com/bob"]

        # Each user gets their own RSVP token, plus the shared fields.
        assert alice["rsvpToken"] == "tok-alice"
        assert bob["rsvpToken"] == "tok-bob"
        assert alice["eventId"] == 42
        assert alice["title"] == "Nouvelle sortie"
        assert "badgeCount" in alice


def test_only_users_in_mapping_are_notified():
    with _session() as session:
        session.add(_user("alice"))
        session.add(_user("bob"))
        session.add(_subscription("alice"))
        session.add(_subscription("bob"))
        session.commit()

        with patch("bbe2.services.push_service.webpush") as mock_webpush:
            send_push_to_users_with_data(
                session=session,
                settings=_settings(),
                title="t",
                body="b",
                extra_by_user={"alice": {"eventId": 1, "rsvpToken": "x"}},
            )

        assert mock_webpush.call_count == 1
        endpoint = mock_webpush.call_args_list[0].kwargs["subscription_info"][
            "endpoint"
        ]
        assert endpoint == "https://push.example.com/alice"


def test_master_switch_off_suppresses_send_to_user():
    session = _session()
    _user_with_device(session, "off-user", receives_push=False)

    with patch("bbe2.services.push_service._send_push") as mock_send:
        send_push_to_user(session, MagicMock(), "off-user", "t", "b")

    mock_send.assert_not_called()


def test_master_switch_on_allows_send_to_user():
    session = _session()
    _user_with_device(session, "on-user", receives_push=True)

    with patch("bbe2.services.push_service._send_push") as mock_send:
        send_push_to_user(session, MagicMock(), "on-user", "t", "b")

    mock_send.assert_called_once()


def test_send_to_users_skips_opted_out_users():
    session = _session()
    _user_with_device(session, "on-user", receives_push=True)
    _user_with_device(session, "off-user", receives_push=False)

    with patch("bbe2.services.push_service._send_push") as mock_send:
        send_push_to_users(session, MagicMock(), ["on-user", "off-user"], "t", "b")

    # Only the opted-in user's single device is sent to.
    assert mock_send.call_count == 1


def test_send_with_data_skips_opted_out_users():
    session = _session()
    _user_with_device(session, "on-user", receives_push=True)
    _user_with_device(session, "off-user", receives_push=False)

    with patch("bbe2.services.push_service._send_push") as mock_send:
        send_push_to_users_with_data(
            session=session,
            settings=MagicMock(),
            title="t",
            body="b",
            extra_by_user={
                "on-user": {"eventId": 1, "rsvpToken": "x"},
                "off-user": {"eventId": 1, "rsvpToken": "y"},
            },
        )

    # The master switch also applies to per-user-data (RSVP) pushes.
    assert mock_send.call_count == 1
    assert mock_send.call_args.args[2].user_id == "on-user"
