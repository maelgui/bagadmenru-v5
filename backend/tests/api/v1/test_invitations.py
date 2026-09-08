"""Tests for the self-service invitation flow (api/v1/endpoints/invitations).

The invitation system supports two delivery paths sharing one permission:

* link/QR  -> email NOT proven -> OTP required at signup
* email    -> email proven     -> OTP skipped only if the address is unchanged

These tests drive the HTTP endpoints end to end against the in-memory SQLite
fixture, capturing outgoing emails (and the OTP code) via a fake EmailSender.
"""

from typing import Optional

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from bbe2.database import get_engine
from bbe2.dependencies import SenderDep
from bbe2.main import app
from bbe2.models.action_token import ActionTokenDB, ActionTokenValue
from bbe2.models.user import GroupDB, RoleDB, UserDB
from bbe2.utils.action_token import hash_action_token
from bbe2.utils.templates import EmailData, EmailSender

DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"


def _session():
    engine = get_engine(DATABASE_URL)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


class FakeSender:
    """Capturing stand-in for EmailSender: records calls, sends nothing."""

    def __init__(self) -> None:
        self.sent: list[dict] = []
        self.fail = False

    async def batch_send_emails(self, subject, template_name, template_data):
        if self.fail:
            from bbe2.services.email import EmailSendError

            raise EmailSendError("simulated SMTP failure")
        for d in template_data:
            self.sent.append(
                {
                    "subject": subject,
                    "template_name": template_name,
                    "to": d.to,
                    "template_data": d.template_data,
                }
            )

    # -- helpers for assertions --------------------------------------------
    def last_code(self) -> Optional[str]:
        for entry in reversed(self.sent):
            if entry["template_name"] == "email_otp":
                return entry["template_data"]["code"]
        return None

    def templates_used(self) -> list[str]:
        return [e["template_name"] for e in self.sent]


@pytest.fixture()
def sender(client):
    """Override the EmailSender dependency with a capturing fake."""
    fake = FakeSender()
    app.dependency_overrides[EmailSender] = lambda: fake
    yield fake
    app.dependency_overrides.pop(EmailSender, None)


def _mark_group_default(group_id: int, is_default: bool = True) -> None:
    with _session() as s:
        g = s.get(GroupDB, group_id)
        g.is_default = is_default
        s.commit()


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------


def test_create_link_invitation_returns_link_and_no_email(client: TestClient, sender):
    resp = client.post("/api/v1/invitations", json={"channel": "link"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["channel"] == "link"
    assert body["token"]
    assert body["token"] in body["url"]
    assert "/invite/" in body["url"]
    # Single validity window for both channels (the longer one: 3 days).
    assert body["expires_in"] == 3600 * 24 * 3
    # Nothing is emailed for the link channel.
    assert sender.sent == []


def test_create_email_invitation_sends_email(client: TestClient, sender):
    resp = client.post(
        "/api/v1/invitations",
        json={
            "channel": "email",
            "email": "New.Member@example.com",
            "first_name": "Newbie",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["channel"] == "email"
    assert body["expires_in"] == 3600 * 24 * 3  # 3 days
    # Exactly one invitation email, to the normalized address.
    assert sender.templates_used() == ["email_invitation"]
    assert sender.sent[0]["to"] == "new.member@example.com"
    assert body["token"] in sender.sent[0]["template_data"]["url"]


def test_email_channel_requires_email(client: TestClient, sender):
    resp = client.post("/api/v1/invitations", json={"channel": "email"})
    assert resp.status_code == 422


def test_create_rejects_existing_email(client: TestClient, sender):
    # john.doe@example.com is seeded by the fixture.
    resp = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": "john.doe@example.com"},
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Reading the invitation (public signup form prefill)
# ---------------------------------------------------------------------------


def test_get_invitation_returns_prefill(client: TestClient, sender):
    created = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": "proven@example.com"},
    ).json()

    info = client.get(f"/api/v1/invitations/{created['token']}")
    assert info.status_code == 200, info.text
    data = info.json()
    assert data["email"] == "proven@example.com"
    # Emailed address is proven -> locked on the form.
    assert data["email_locked"] is True
    # No profile prefill is exposed anymore (the invitee fills it in).
    assert "first_name" not in data
    assert "instrument_id" not in data


def test_get_link_invitation_email_not_locked(client: TestClient, sender):
    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    data = client.get(f"/api/v1/invitations/{created['token']}").json()
    assert data["email_locked"] is False


def test_get_unknown_invitation_404(client: TestClient, sender):
    assert client.get("/api/v1/invitations/does-not-exist").status_code == 404


# ---------------------------------------------------------------------------
# Accept — email proven path (no OTP)
# ---------------------------------------------------------------------------


def test_accept_email_proven_same_address_skips_otp(client: TestClient, sender):
    created = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": "alice@example.com", "instrument_id": 1},
    ).json()
    token = created["token"]

    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Alice",
            "last_name": "Martin",
            "email": "alice@example.com",
            "instrument_id": 1,
        },
    )
    assert resp.status_code == 201, resp.text
    # Token returned in the body (used for Bearer-based passkey enrollment) and
    # an additive multi-account session is established (never clobbers others).
    assert resp.json()["access_token"]
    assert any(c.startswith("bmr_session_") for c in resp.cookies)
    assert "active_account" in resp.cookies
    # The legacy single-session cookie is not used.
    assert "access_token" not in resp.cookies

    # Account created.
    with _session() as s:
        user = s.scalars(
            select(UserDB).where(UserDB.email == "alice@example.com")
        ).one()
        assert user.first_name == "Alice"
        # Passkey-first: no password set on accept.
        assert user.password is None
    # No email sent on accept (only the earlier invitation email).
    assert sender.templates_used() == ["email_invitation"]


def test_accept_links_orphan_membership_by_adherent_email(client: TestClient, sender):
    from datetime import datetime, timezone

    from bbe2.models.helloasso import HelloAssoMembershipDB

    adherent_email = "carol.adherent@example.com"
    payer_email = "parent.payer@example.com"

    # An orphan membership ingested earlier: the adherent email is Carol's, but
    # it was paid by a parent (different payer email). No member matched at
    # ingestion, so it sits unlinked.
    with _session() as s:
        s.add(
            HelloAssoMembershipDB(
                helloasso_order_id=555,
                helloasso_item_id=5551,
                user_id=None,
                payer_email=payer_email,
                adherent_email=adherent_email,
                adherent_first_name="Carol",
                adherent_last_name="Adherent",
                amount=4400,
                order_date=datetime.now(tz=timezone.utc),
                state="Processed",
                raw_payload={},
            )
        )
        s.commit()

    # Carol accepts an email-proven invitation with her own address.
    token = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": adherent_email, "instrument_id": 1},
    ).json()["token"]
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Carol",
            "last_name": "Adherent",
            "email": adherent_email,
            "instrument_id": 1,
        },
    )
    assert resp.status_code == 201, resp.text

    # The orphan membership is now linked, so it no longer appears in the
    # admin "unlinked" list (checked through the API, i.e. the same DB session
    # path the endpoint used, avoiding a stale concurrent read).
    unlinked = client.get("/api/v1/helloasso/orders/unlinked").json()
    assert all(r["helloasso_item_id"] != 5551 for r in unlinked)


def test_accept_does_not_link_by_payer_email(client: TestClient, sender):
    from datetime import datetime, timezone

    from bbe2.models.helloasso import HelloAssoMembershipDB

    # The new account's email matches only the PAYER email, not the adherent
    # email. We must NOT link it: the payer is often a parent, and linking would
    # wrongly attach a child's adhesion to the parent's account.
    parent_email = "parent.only@example.com"
    with _session() as s:
        s.add(
            HelloAssoMembershipDB(
                helloasso_order_id=666,
                helloasso_item_id=6661,
                user_id=None,
                payer_email=parent_email,
                adherent_email="child.adherent@example.com",
                adherent_first_name="Child",
                adherent_last_name="Adherent",
                amount=4400,
                order_date=datetime.now(tz=timezone.utc),
                state="Processed",
                raw_payload={},
            )
        )
        s.commit()

    token = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": parent_email, "instrument_id": 1},
    ).json()["token"]
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Parent",
            "last_name": "Only",
            "email": parent_email,
            "instrument_id": 1,
        },
    )
    assert resp.status_code == 201, resp.text

    # The membership stays unlinked (payer email must not trigger a link): it is
    # still present in the admin "unlinked" list.
    unlinked = client.get("/api/v1/helloasso/orders/unlinked").json()
    assert any(r["helloasso_item_id"] == 6661 for r in unlinked)


def test_accept_email_proven_changed_address_requires_otp(client: TestClient, sender):
    created = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": "bob@example.com", "instrument_id": 1},
    ).json()
    token = created["token"]

    # Submitting a *different* address must fall back to OTP -> 400 without code.
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Bob",
            "last_name": "Le",
            "email": "different@example.com",
            "instrument_id": 1,
        },
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Accept — link path (OTP required)
# ---------------------------------------------------------------------------


def test_accept_link_requires_otp(client: TestClient, sender):
    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Carol",
            "last_name": "Nova",
            "email": "carol@example.com",
            "instrument_id": 1,
        },
    )
    assert resp.status_code == 400  # no code supplied


def test_full_link_otp_signup(client: TestClient, sender):
    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]

    # Request an OTP for the address the invitee entered.
    otp_resp = client.post(
        f"/api/v1/invitations/{token}/otp", json={"email": "dan@example.com"}
    )
    assert otp_resp.status_code == 204, otp_resp.text
    code = sender.last_code()
    assert code and len(code) == 6

    # Wrong code is rejected.
    bad = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Dan",
            "last_name": "Ok",
            "email": "dan@example.com",
            "instrument_id": 1,
            "code": "000000" if code != "000000" else "111111",
        },
    )
    assert bad.status_code == 400

    # Correct code creates the account.
    ok = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Dan",
            "last_name": "Ok",
            "email": "dan@example.com",
            "instrument_id": 1,
            "code": code,
        },
    )
    assert ok.status_code == 201, ok.text
    with _session() as s:
        assert s.scalars(select(UserDB).where(UserDB.email == "dan@example.com")).one()


def test_otp_rejected_for_different_email_than_requested(client: TestClient, sender):
    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]
    client.post(f"/api/v1/invitations/{token}/otp", json={"email": "eve@example.com"})
    code = sender.last_code()
    # Same code but a different address on accept -> rejected.
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Eve",
            "last_name": "X",
            "email": "someone.else@example.com",
            "instrument_id": 1,
            "code": code,
        },
    )
    assert resp.status_code == 400


def test_otp_request_rejects_existing_email(client: TestClient, sender):
    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]
    resp = client.post(
        f"/api/v1/invitations/{token}/otp",
        json={"email": "john.doe@example.com"},
    )
    assert resp.status_code == 409


def test_otp_resend_is_rate_limited(client: TestClient, sender):
    """A second OTP request within the cooldown is refused with 429.

    Once the recorded ``last_otp_sent_at`` is aged past the cooldown, a new
    request is accepted again.
    """
    from datetime import datetime, timedelta, timezone

    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]

    first = client.post(
        f"/api/v1/invitations/{token}/otp", json={"email": "spammy@example.com"}
    )
    assert first.status_code == 204, first.text

    # Immediate re-request is throttled.
    second = client.post(
        f"/api/v1/invitations/{token}/otp", json={"email": "spammy@example.com"}
    )
    assert second.status_code == 429, second.text
    assert "Retry-After" in second.headers

    # Age the last-sent timestamp beyond the cooldown, then it works again.
    token_hash = hash_action_token(token)
    with _session() as s:
        row = s.scalars(
            select(ActionTokenDB).where(ActionTokenDB.token_hash == token_hash)
        ).one()
        past = datetime.now(timezone.utc) - timedelta(seconds=120)
        row.payload = {**row.payload, "last_otp_sent_at": past.isoformat()}
        s.commit()

    third = client.post(
        f"/api/v1/invitations/{token}/otp", json={"email": "spammy@example.com"}
    )
    assert third.status_code == 204, third.text


# ---------------------------------------------------------------------------
# Single-use & default-groups guarantees
# ---------------------------------------------------------------------------


def test_invitation_is_single_use(client: TestClient, sender):
    created = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": "frank@example.com", "instrument_id": 1},
    ).json()
    token = created["token"]
    payload = {
        "first_name": "Frank",
        "last_name": "Uno",
        "email": "frank@example.com",
        "instrument_id": 1,
    }
    first = client.post(f"/api/v1/invitations/{token}/accept", json=payload)
    assert first.status_code == 201, first.text
    # Second use of the same invitation must be rejected (token consumed).
    second = client.post(f"/api/v1/invitations/{token}/accept", json=payload)
    assert second.status_code == 404


def test_accept_grants_default_groups_only(client: TestClient, sender):
    # Seed a default group and a privileged (non-default) group.
    with _session() as s:
        s.merge(GroupDB(id=50, name="Membres", color="#111", is_default=True))
        s.merge(GroupDB(id=51, name="Staff", color="#222", is_default=False))
        s.commit()

    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]
    client.post(f"/api/v1/invitations/{token}/otp", json={"email": "gina@example.com"})
    code = sender.last_code()
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Gina",
            "last_name": "Groups",
            "email": "gina@example.com",
            "instrument_id": 1,
            "code": code,
        },
    )
    assert resp.status_code == 201, resp.text

    with _session() as s:
        user = s.scalars(select(UserDB).where(UserDB.email == "gina@example.com")).one()
        group_ids = {g.id for g in user.groups}
        # Default group + instrument (1) present; the privileged group (51) is not.
        assert 50 in group_ids
        assert 1 in group_ids
        assert 51 not in group_ids


def test_expired_invitation_rejected(client: TestClient, sender):
    """An expired invitation token cannot be read or accepted."""
    from bbe2.utils.action_token import create_action_token

    with _session() as s:
        token = create_action_token(
            s,
            ActionTokenValue.Invitation,
            {
                "channel": "link",
                "email_proven": False,
                "email": None,
            },
            expires_in=-1,  # already expired
        )
        s.commit()
    assert client.get(f"/api/v1/invitations/{token}").status_code == 404


def test_otp_request_returns_503_when_smtp_down(client: TestClient, sender):
    """A failed OTP email surfaces a clean 503, not a 500."""
    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]
    sender.fail = True
    resp = client.post(
        f"/api/v1/invitations/{token}/otp", json={"email": "smtp-down@example.com"}
    )
    assert resp.status_code == 503, resp.text
    assert "indisponible" in resp.json()["detail"].lower()


def test_email_invitation_returns_503_when_smtp_down(client: TestClient, sender):
    """Generating an email-channel invitation surfaces 503 if sending fails."""
    sender.fail = True
    resp = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": "smtp-fail@example.com"},
    )
    assert resp.status_code == 503, resp.text


def test_accept_does_not_depend_on_email(client: TestClient, sender):
    """Accept sends no email and logs the member in (passkey-first flow)."""
    created = client.post(
        "/api/v1/invitations",
        json={"channel": "email", "email": "resilient@example.com", "instrument_id": 1},
    ).json()
    token = created["token"]
    # Even if the mailer would fail, accept must succeed: it sends no email.
    sender.fail = True
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "Rési",
            "last_name": "Lient",
            "email": "resilient@example.com",
            "instrument_id": 1,
        },
    )
    assert resp.status_code == 201, resp.text
    # Token in body + additive session cookie; legacy cookie unused.
    assert resp.json()["access_token"]
    assert any(c.startswith("bmr_session_") for c in resp.cookies)
    assert "access_token" not in resp.cookies
    with _session() as s:
        assert s.scalars(
            select(UserDB).where(UserDB.email == "resilient@example.com")
        ).one()


def test_accept_never_grants_admin_even_if_default(client: TestClient, sender):
    """Defense in depth: a default group carrying the admin role is dropped.

    Guards against a misconfigured default group escalating every invited
    member to admin.
    """
    with _session() as s:
        admin_role = s.get(RoleDB, "admin") or RoleDB(id="admin", description="Admin")
        s.merge(admin_role)
        s.flush()
        # A default group that (wrongly) grants admin, plus a benign default.
        bad = GroupDB(id=70, name="AdminDefault", color="#000", is_default=True)
        bad.roles = [s.get(RoleDB, "admin")]
        s.merge(bad)
        s.merge(GroupDB(id=71, name="Membres", color="#111", is_default=True))
        s.commit()

    created = client.post("/api/v1/invitations", json={"channel": "link"}).json()
    token = created["token"]
    client.post(
        f"/api/v1/invitations/{token}/otp", json={"email": "noadmin@example.com"}
    )
    code = sender.last_code()
    resp = client.post(
        f"/api/v1/invitations/{token}/accept",
        json={
            "first_name": "No",
            "last_name": "Admin",
            "email": "noadmin@example.com",
            "instrument_id": 1,
            "code": code,
        },
    )
    assert resp.status_code == 201, resp.text
    with _session() as s:
        user = s.scalars(
            select(UserDB).where(UserDB.email == "noadmin@example.com")
        ).one()
        role_ids = {r.id for g in user.groups for r in g.roles}
        group_ids = {g.id for g in user.groups}
        # The admin-granting default group is excluded; the benign one stays.
        assert "admin" not in role_ids
        assert 70 not in group_ids
        assert 71 in group_ids
