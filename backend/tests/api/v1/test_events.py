from unittest.mock import ANY

from fastapi.testclient import TestClient
from itsdangerous import URLSafeTimedSerializer

from bbe2.utils.auth import ActionTokenValue

# Must match token_secret_key in tests/conftest.py::get_fake_settings
TOKEN_SECRET_KEY = "fakesecretkey"
# Existing user / event seeded by tests/conftest.py::populate_db
SEEDED_USER_ID = "a8e2d3249e9d997e"
SEEDED_EVENT_ID = 1


def make_response_token(
    user_id: str = SEEDED_USER_ID,
    event_id: int = SEEDED_EVENT_ID,
    action: str = ActionTokenValue.CreateResponseByToken.value,
) -> str:
    """Forge the same signed token that the new-event email embeds.

    Mirrors bbe2.services.notifications.notify_new_event, which builds the
    email quick link as ``{frontend_url}/s/answer/{token}``.
    """
    serializer = URLSafeTimedSerializer(TOKEN_SECRET_KEY)
    return serializer.dumps(
        {"user_id": user_id, "event_id": event_id, "action": action}
    )


def test_list_events(client: TestClient):
    response = client.get("/api/v1/events/")
    print(response.json())
    assert response.status_code == 200
    assert response.json() == [
        {
            "title": "Saint Nicolas",
            "date": "2022-12-09",
            "id": 1,
            "description": "Rendez-vous 14h au parc",
            "costume": "COSTUME",
            "category": "TEST",
            "is_in_doodle": True,
        }
    ]


def test_fetch_event(client: TestClient):
    response = client.get("/api/v1/events/1")
    assert response.status_code == 200
    assert response.json() == {
        "title": "Saint Nicolas",
        "date": "2022-12-09",
        "id": 1,
        "description": "Rendez-vous 14h au parc",
        "costume": "COSTUME",
        "category": "TEST",
        "is_in_doodle": True,
    }


def test_create_event(client: TestClient):
    response = client.post(
        "/api/v1/events/",
        json={
            "title": "Fete de la musique",
            "description": "Rendez-vous a 21h au parc",
            "date": "2022-06-21",
            "costume": "POLO",
            "category": "CAT1",
            "is_in_doodle": True,
        },
    )
    assert response.status_code == 201
    assert response.json() == {
        "id": 2,
        "title": "Fete de la musique",
        "description": "Rendez-vous a 21h au parc",
        "date": "2022-06-21",
        "costume": "POLO",
        "category": "CAT1",
        "is_in_doodle": True,
    }


def test_edit_event(client: TestClient):
    response = client.put(
        "/api/v1/events/1",
        json={
            "title": "Saint Nicolas",
            "date": "2022-12-09",
            "description": "Rendez-vous 13h au foyer logement",
            "costume": "COSTUME",
            "category": "CAT1",
            "is_in_doodle": True,
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "title": "Saint Nicolas",
        "date": "2022-12-09",
        "id": 1,
        "description": "Rendez-vous 13h au foyer logement",
        "costume": "COSTUME",
        "category": "CAT1",
        "is_in_doodle": True,
    }


def test_put_responses(client: TestClient):
    response = client.put(
        "/api/v1/events/1/responses",
        json={
            "user_id": "a8e2d3249e9d997e",
            "value": True,
        },
    )
    print(response.text)
    assert response.status_code == 200
    assert response.json() == {
        "date": ANY,
        "event_id": 1,
        "user_id": "a8e2d3249e9d997e",
        "value": True,
    }


def test_list_responses(client: TestClient):
    response = client.get(
        "/api/v1/responses/",
    )
    assert response.status_code == 200
    assert response.json() == [
        {
            "date": "2024-01-01T00:00:00",
            "event_id": 1,
            "user_id": "a8e2d3249e9d997e",
            "value": True,
        },
    ]


# --- Event response via email quick link (token-based endpoints) ------------
#
# The "new event" email embeds a signed token in a quick link
# ({frontend_url}/s/answer/{token}). The frontend page then calls:
#   GET /api/v1/responses/link/prepare  -> load event/user/existing response
#   PUT /api/v1/responses/link/save     -> save the response
# Both authenticate solely via the `token` header (no JWT required).


def test_get_response_by_token_returns_event_user_and_existing_response(
    client: TestClient,
):
    token = make_response_token()
    response = client.get(
        "/api/v1/responses/link/prepare",
        headers={"token": token},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["event"]["id"] == SEEDED_EVENT_ID
    assert body["event"]["title"] == "Saint Nicolas"
    # user is serialized via schemas.MyProfileUpdate (no id/email exposed)
    assert body["user"]["first_name"] == "john"
    assert body["user"]["last_name"] == "doe"
    # conftest seeds an existing response (value=True) for this user/event
    assert body["response"] == {
        "date": "2024-01-01T00:00:00",
        "event_id": SEEDED_EVENT_ID,
        "user_id": SEEDED_USER_ID,
        "value": True,
    }


def test_get_response_by_token_rejects_invalid_signature(client: TestClient):
    response = client.get(
        "/api/v1/responses/link/prepare",
        headers={"token": "not-a-valid-token"},
    )
    assert response.status_code == 403


def test_get_response_by_token_rejects_wrong_action(client: TestClient):
    # A validly-signed token but for a different action must be refused.
    token = make_response_token(action=ActionTokenValue.Unsubscribe.value)
    response = client.get(
        "/api/v1/responses/link/prepare",
        headers={"token": token},
    )
    assert response.status_code == 403


def test_get_response_by_token_missing_token_header(client: TestClient):
    response = client.get("/api/v1/responses/link/prepare")
    assert response.status_code == 422


def test_create_response_by_token_saves_response(client: TestClient):
    # Create a fresh event with no existing response for the seeded user.
    create = client.post(
        "/api/v1/events/",
        json={
            "title": "Concert de printemps",
            "description": "Rendez-vous 18h",
            "date": "2025-04-12",
            "costume": "POLO",
            "category": "CAT1",
            "is_in_doodle": True,
        },
    )
    assert create.status_code == 201
    event_id = create.json()["id"]

    token = make_response_token(event_id=event_id)

    # No response yet for this fresh event.
    prepare = client.get(
        "/api/v1/responses/link/prepare",
        headers={"token": token},
    )
    assert prepare.status_code == 200
    assert prepare.json()["response"] is None

    # Save a response via the quick-link endpoint.
    save = client.put(
        "/api/v1/responses/link/save",
        headers={"token": token},
        json={"value": False},
    )
    assert save.status_code == 200
    assert save.json() == {
        "date": ANY,
        "event_id": event_id,
        "user_id": SEEDED_USER_ID,
        "value": False,
    }

    # Preparing again now reflects the saved response.
    prepare_again = client.get(
        "/api/v1/responses/link/prepare",
        headers={"token": token},
    )
    assert prepare_again.status_code == 200
    assert prepare_again.json()["response"]["value"] is False


def test_create_response_by_token_updates_existing_response(client: TestClient):
    # Seeded user already answered True on the seeded event; flip it to False.
    token = make_response_token()
    save = client.put(
        "/api/v1/responses/link/save",
        headers={"token": token},
        json={"value": False},
    )
    assert save.status_code == 200
    assert save.json() == {
        "date": ANY,
        "event_id": SEEDED_EVENT_ID,
        "user_id": SEEDED_USER_ID,
        "value": False,
    }


def test_create_response_by_token_rejects_invalid_token(client: TestClient):
    save = client.put(
        "/api/v1/responses/link/save",
        headers={"token": "tampered"},
        json={"value": True},
    )
    assert save.status_code == 403
