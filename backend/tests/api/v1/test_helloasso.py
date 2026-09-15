"""Tests for the HelloAsso membership feature."""

import hashlib
import hmac
import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from bbe2.config import get_settings
from bbe2.main import app
from bbe2.schemas.helloasso import (
    HelloAssoNotification,
    MembershipStatus,
)
from bbe2.services import membership as membership_service
from tests.conftest import get_fake_settings

WEBHOOK_TOKEN = "test-webhook-token"
SIGNATURE_KEY = "test-signature-key"


def _current_season_date() -> str:
    """An ISO date guaranteed to fall in the current season (from 1 Sept)."""
    now = datetime.now(tz=timezone.utc)
    start_year = membership_service.season_start_year(now)
    # 2 September of the season's start year is always within that season.
    return datetime(start_year, 9, 2, 10, 0, tzinfo=timezone.utc).isoformat()


def _settings_with_helloasso():
    settings = get_fake_settings()
    settings.helloasso_webhook_token = WEBHOOK_TOKEN
    settings.helloasso_signature_key = SIGNATURE_KEY
    return settings


@pytest.fixture()
def helloasso_client(client: TestClient):
    """The shared client, but with HelloAsso auth configured in settings."""
    app.dependency_overrides[get_settings] = _settings_with_helloasso
    yield client
    app.dependency_overrides[get_settings] = get_fake_settings


def _membership_order(
    *,
    order_id: int = 1001,
    item_id: int = 2001,
    email: str = "john.doe@example.com",
    order_date: str | None = None,
    state: str = "Processed",
    item_type: str = "Membership",
    amount: int = 2500,
    tier: str = "Adhésion adulte",
) -> dict:
    if order_date is None:
        order_date = _current_season_date()
    # ``email`` is the *adherent's* linking address: it goes into the item's
    # "Email" custom field, which is what auto-linking matches on. The payer is
    # a separate person (we only ever link on the adherent email, never the
    # payer), so give the payer a distinct address.
    return {
        "eventType": "Order",
        "data": {
            "id": order_id,
            "date": order_date,
            "payer": {
                "email": "payer@example.com",
                "firstName": "John",
                "lastName": "Doe",
            },
            "items": [
                {
                    "id": item_id,
                    "type": item_type,
                    "amount": amount,
                    "state": state,
                    "tierDescription": tier,
                    "customFields": [
                        {"name": "Email", "type": "TextInput", "answer": email},
                    ],
                }
            ],
        },
    }


# --- Season / status computation (pure logic) -------------------------------


def test_season_start_year():
    # September onward -> season started this year.
    assert membership_service.season_start_year(datetime(2025, 9, 1)) == 2025
    assert membership_service.season_start_year(datetime(2025, 12, 31)) == 2025
    # Before September -> season started previous year.
    assert membership_service.season_start_year(datetime(2025, 8, 31)) == 2024
    assert membership_service.season_start_year(datetime(2025, 1, 15)) == 2024


def test_season_label():
    assert membership_service.season_label(datetime(2025, 10, 1)) == "2025-2026"
    assert membership_service.season_label(datetime(2025, 3, 1)) == "2024-2025"


# --- Webhook authenticity ---------------------------------------------------


def test_webhook_rejected_without_auth(helloasso_client: TestClient):
    resp = helloasso_client.post("/api/v1/helloasso/webhook", json=_membership_order())
    assert resp.status_code == 401


def test_webhook_accepts_valid_token(helloasso_client: TestClient):
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(),
    )
    assert resp.status_code == 200
    assert resp.json()["memberships_processed"] == 1


def test_webhook_rejects_wrong_token(helloasso_client: TestClient):
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook?token=wrong",
        json=_membership_order(),
    )
    assert resp.status_code == 401


def test_webhook_accepts_valid_hmac_signature(helloasso_client: TestClient):
    payload = _membership_order()
    body = json.dumps(payload)
    signature = hmac.new(
        SIGNATURE_KEY.encode("utf-8"), body.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook",
        content=body,
        headers={
            "content-type": "application/json",
            "x-ha-signature": signature,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["memberships_processed"] == 1


def test_webhook_rejects_bad_hmac_signature(helloasso_client: TestClient):
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook",
        json=_membership_order(),
        headers={"x-ha-signature": "deadbeef"},
    )
    assert resp.status_code == 401


# --- Ingestion behaviour ----------------------------------------------------


def test_webhook_ignores_non_membership_items(helloasso_client: TestClient):
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(item_type="Donation"),
    )
    assert resp.status_code == 200
    assert resp.json()["memberships_processed"] == 0


def test_webhook_ignores_non_order_event(helloasso_client: TestClient):
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json={"eventType": "Payment", "data": {}},
    )
    assert resp.status_code == 200
    assert resp.json()["memberships_processed"] == 0


def test_webhook_is_idempotent(helloasso_client: TestClient):
    order = _membership_order()
    url = "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN
    helloasso_client.post(url, json=order)
    helloasso_client.post(url, json=order)  # replay

    # Member should have exactly one membership, and be active.
    resp = helloasso_client.get("/api/v1/profiles/me/membership")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["history"]) == 1
    assert body["status"] == MembershipStatus.ACTIVE.value


def test_webhook_auto_links_by_email(helloasso_client: TestClient):
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(email="john.doe@example.com"),
    )
    resp = helloasso_client.get("/api/v1/profiles/me/membership")
    assert resp.json()["status"] == MembershipStatus.ACTIVE.value
    # No unlinked rows.
    unlinked = helloasso_client.get("/api/v1/helloasso/orders/unlinked")
    assert unlinked.json() == []


def test_webhook_auto_links_by_email_case_insensitive(helloasso_client: TestClient):
    # HelloAsso payer email differs only in case from the stored member email;
    # it must still auto-link rather than surface as unlinked.
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(email="John.Doe@Example.com"),
    )
    resp = helloasso_client.get("/api/v1/profiles/me/membership")
    assert resp.json()["status"] == MembershipStatus.ACTIVE.value
    unlinked = helloasso_client.get("/api/v1/helloasso/orders/unlinked")
    assert unlinked.json() == []


def test_webhook_unknown_email_stays_unlinked(helloasso_client: TestClient):
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(email="stranger@example.com", item_id=9999),
    )
    # Member has no membership.
    resp = helloasso_client.get("/api/v1/profiles/me/membership")
    assert resp.json()["status"] == MembershipStatus.NONE.value
    # The row surfaces as unlinked, carrying the adherent email (the linking
    # field) that matched no member.
    unlinked = helloasso_client.get("/api/v1/helloasso/orders/unlinked")
    rows = unlinked.json()
    assert len(rows) == 1
    assert rows[0]["adherent_email"] == "stranger@example.com"


# --- Status endpoint behaviour ----------------------------------------------


def test_membership_none_when_never_member(helloasso_client: TestClient):
    resp = helloasso_client.get("/api/v1/profiles/me/membership")
    assert resp.status_code == 200
    assert resp.json()["status"] == MembershipStatus.NONE.value
    assert resp.json()["history"] == []


def test_refunded_membership_not_active(helloasso_client: TestClient):
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(state="Refunded"),
    )
    resp = helloasso_client.get("/api/v1/profiles/me/membership")
    body = resp.json()
    # There is history, but it does not count as active -> expired.
    assert len(body["history"]) == 1
    assert body["status"] == MembershipStatus.EXPIRED.value


def test_past_season_membership_is_expired(helloasso_client: TestClient):
    # An order two seasons ago is history but not active.
    now = datetime.now(tz=timezone.utc)
    old_start = membership_service.season_start_year(now) - 2
    old_date = datetime(old_start, 10, 1, tzinfo=timezone.utc).isoformat()
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(order_date=old_date),
    )
    body = helloasso_client.get("/api/v1/profiles/me/membership").json()
    assert body["status"] == MembershipStatus.EXPIRED.value
    assert body["history"][0]["season"] == f"{old_start}-{old_start + 1}"


# --- Admin manual linking ---------------------------------------------------


def test_admin_link_unlinked_membership(helloasso_client: TestClient):
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(email="stranger@example.com", item_id=9999),
    )
    unlinked = helloasso_client.get("/api/v1/helloasso/orders/unlinked").json()
    membership_id = unlinked[0]["id"]

    resp = helloasso_client.post(
        f"/api/v1/helloasso/orders/{membership_id}/link",
        json={"user_id": "a8e2d3249e9d997e"},
    )
    assert resp.status_code == 200

    # Now the member sees the membership and the unlinked list is empty.
    assert helloasso_client.get("/api/v1/helloasso/orders/unlinked").json() == []
    me = helloasso_client.get("/api/v1/profiles/me/membership").json()
    assert len(me["history"]) == 1


def test_admin_link_unknown_member_404(helloasso_client: TestClient):
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(email="stranger@example.com", item_id=9999),
    )
    membership_id = helloasso_client.get("/api/v1/helloasso/orders/unlinked").json()[0][
        "id"
    ]
    resp = helloasso_client.post(
        f"/api/v1/helloasso/orders/{membership_id}/link",
        json={"user_id": "does-not-exist"},
    )
    assert resp.status_code == 404


def test_admin_link_unknown_membership_404(helloasso_client: TestClient):
    resp = helloasso_client.post(
        "/api/v1/helloasso/orders/nope/link",
        json={"user_id": "a8e2d3249e9d997e"},
    )
    assert resp.status_code == 404


def test_admin_delete_membership(helloasso_client: TestClient):
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_membership_order(email="stranger@example.com", item_id=9999),
    )
    membership_id = helloasso_client.get("/api/v1/helloasso/orders/unlinked").json()[0][
        "id"
    ]

    resp = helloasso_client.delete(f"/api/v1/helloasso/orders/{membership_id}")
    assert resp.status_code == 204

    # The row is gone from the unlinked list.
    assert helloasso_client.get("/api/v1/helloasso/orders/unlinked").json() == []


def test_admin_delete_unknown_membership_404(helloasso_client: TestClient):
    resp = helloasso_client.delete("/api/v1/helloasso/orders/nope")
    assert resp.status_code == 404


# --- Camel-case parsing sanity check ----------------------------------------


def test_notification_parses_camel_case():
    notif = HelloAssoNotification.model_validate(_membership_order())
    assert notif.event_type == "Order"
    assert notif.data.payer.first_name == "John"
    assert notif.data.items[0].tier_description == "Adhésion adulte"


# --- Real HelloAsso payload (adherent, custom fields, multiple items) --------


def _real_order(*, member_email: str = "mael@gui.bzh") -> dict:
    """A realistic order: two membership items for the same adherent, paid by a
    different payer, with the adherent email in the "Email" custom field.
    """
    return {
        "eventType": "Order",
        "data": {
            "id": 97002,
            "date": _current_season_date(),
            "payer": {
                "email": "payer.parent@example.com",
                "firstName": "Maud",
                "lastName": "Garcon",
            },
            "items": [
                {
                    "id": 105314,
                    "type": "Membership",
                    "amount": 4400,
                    "state": "Processed",
                    "name": "ADHESION OBLIGATOIRE",
                    "tierDescription": "L'adhésion est obligatoire et distincte",
                    "user": {"firstName": "Mael", "lastName": "Gui"},
                    "customFields": [
                        {"name": "Téléphone", "type": "Phone", "answer": "0695333590"},
                        {"name": "Email", "type": "TextInput", "answer": member_email},
                    ],
                },
                {
                    "id": 105316,
                    "type": "Membership",
                    "amount": 4400,
                    "state": "Processed",
                    "name": "ADHESION OBLIGATOIRE",
                    "tierDescription": "L'adhésion est obligatoire et distincte",
                    "user": {"firstName": "Mael", "lastName": "Gui"},
                    "customFields": [
                        {"name": "Email", "type": "TextInput", "answer": "hugiy"},
                    ],
                },
            ],
        },
    }


def test_real_payload_stores_both_items_with_adherent_and_tier(
    helloasso_client: TestClient,
):
    # Adherent email in the custom field matches the seeded member.
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_real_order(member_email="john.doe@example.com"),
    )
    assert resp.status_code == 200
    assert resp.json()["memberships_processed"] == 2

    # Item 105314 has a valid Email custom field matching the member and links
    # to them; item 105316's custom field is "hugiy" (not an email), so it has
    # no adherent email to match and stays unlinked (we never fall back to the
    # payer email).
    body = helloasso_client.get("/api/v1/profiles/me/membership").json()
    assert body["status"] == MembershipStatus.ACTIVE.value
    assert len(body["history"]) == 1
    linked = body["history"][0]
    assert linked["tier_name"] == "ADHESION OBLIGATOIRE"
    assert linked["adherent_first_name"] == "Mael"
    assert linked["adherent_last_name"] == "Gui"
    assert linked["amount"] == 4400

    # The other item surfaces for manual reconciliation, carrying adherent and
    # tier metadata.
    unlinked = helloasso_client.get("/api/v1/helloasso/orders/unlinked").json()
    assert len(unlinked) == 1
    assert unlinked[0]["adherent_first_name"] == "Mael"
    assert unlinked[0]["tier_name"] == "ADHESION OBLIGATOIRE"
    # Item 105316's Email custom field is "hugiy" (not an email), so no
    # adherent email is stored for the unlinked row.
    assert unlinked[0]["adherent_email"] is None


def test_adherent_email_persisted_and_exposed_when_unlinked(
    helloasso_client: TestClient,
):
    # A stranger adherent (custom-field email matches no member) surfaces as
    # unlinked, and its adherent email is persisted and exposed so the
    # reconciliation UI can prefill an invitation to the adherent.
    order = _real_order(member_email="new.adherent@example.com")
    # Drop the second (invalid-email) item so only the unlinked one remains.
    order["data"]["items"] = order["data"]["items"][:1]
    resp = helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN, json=order
    )
    assert resp.status_code == 200

    unlinked = helloasso_client.get("/api/v1/helloasso/orders/unlinked").json()
    assert len(unlinked) == 1
    row = unlinked[0]
    # The adherent email is the custom-field one, not the payer's.
    assert row["adherent_email"] == "new.adherent@example.com"
    assert row["payer_email"] == "payer.parent@example.com"


def test_custom_field_email_links_adherent_not_payer(helloasso_client: TestClient):
    # Payer email is a stranger; the adherent's Email custom field matches the
    # member. The matching item must link to the member (adherent), not to the
    # stranger payer.
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN,
        json=_real_order(member_email="john.doe@example.com"),
    )
    me = helloasso_client.get("/api/v1/profiles/me/membership").json()
    assert me["status"] == MembershipStatus.ACTIVE.value
    # The linked one belongs to the member; the payer stranger never owns it.
    assert me["history"][0]["adherent_last_name"] == "Gui"


def test_no_custom_field_email_stays_unlinked(helloasso_client: TestClient):
    # An item with no usable Email custom field must NOT link on the payer
    # email: linking is adherent-email-only, so the order stays unlinked even
    # though the payer email matches a member.
    order = {
        "eventType": "Order",
        "data": {
            "id": 97010,
            "date": _current_season_date(),
            "payer": {
                "email": "john.doe@example.com",
                "firstName": "John",
                "lastName": "Doe",
            },
            "items": [
                {
                    "id": 105320,
                    "type": "Membership",
                    "amount": 4400,
                    "state": "Processed",
                    "name": "ADHESION",
                    "user": {"firstName": "John", "lastName": "Doe"},
                    "customFields": [],
                },
            ],
        },
    }
    helloasso_client.post(
        "/api/v1/helloasso/webhook?token=" + WEBHOOK_TOKEN, json=order
    )
    # The member (john.doe) is the payer but not matched by adherent email, so
    # they have no membership and the row surfaces as unlinked.
    me = helloasso_client.get("/api/v1/profiles/me/membership").json()
    assert me["status"] == MembershipStatus.NONE.value
    unlinked = helloasso_client.get("/api/v1/helloasso/orders/unlinked").json()
    assert any(r["helloasso_item_id"] == 105320 for r in unlinked)


def test_custom_field_email_parsing():
    order = _real_order(member_email="adherent@example.com")
    notif = HelloAssoNotification.model_validate(order)
    item0, item1 = notif.data.items
    assert item0.name == "ADHESION OBLIGATOIRE"
    assert item0.user.first_name == "Mael"
    assert item0.custom_field_email() == "adherent@example.com"
    # The second item's Email answer "hugiy" is not an email -> ignored.
    assert item1.custom_field_email() is None


def _counter(name: str, labels: dict[str, str]) -> float:
    from prometheus_client import REGISTRY

    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_webhook_counters_ok_ignored_and_rejected(helloasso_client: TestClient):
    def snap():
        return {
            o: _counter("bbe2_helloasso_webhooks_total", {"outcome": o})
            for o in ("ok", "ignored", "invalid_signature", "invalid_json")
        }

    before = snap()

    # Authentic + recognized -> ok
    resp = helloasso_client.post(
        f"/api/v1/helloasso/webhook?token={WEBHOOK_TOKEN}",
        json=_membership_order(),
    )
    assert resp.status_code == 200

    # Authentic + unrecognized shape -> ignored
    resp = helloasso_client.post(
        f"/api/v1/helloasso/webhook?token={WEBHOOK_TOKEN}",
        json={"hello": "world"},
    )
    assert resp.status_code == 200

    # No auth -> invalid_signature
    resp = helloasso_client.post("/api/v1/helloasso/webhook", json=_membership_order())
    assert resp.status_code == 401

    # Authentic + malformed JSON -> invalid_json
    resp = helloasso_client.post(
        f"/api/v1/helloasso/webhook?token={WEBHOOK_TOKEN}",
        content=b"{not json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400

    after = snap()
    assert {k: after[k] - before[k] for k in before} == {
        "ok": 1,
        "ignored": 1,
        "invalid_signature": 1,
        "invalid_json": 1,
    }
