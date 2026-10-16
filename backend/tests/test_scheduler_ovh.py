from unittest.mock import MagicMock, patch

import httpx

from bbe2.services.mailing import OVH_OAUTH2_TOKEN_URL, OvhOAuth2Auth


def _token_response(access_token, expires_in):
    resp = MagicMock(spec=httpx.Response)
    resp.raise_for_status.return_value = None
    resp.json.return_value = {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": expires_in,
    }
    return resp


def _run_flow(auth, request):
    gen = auth.auth_flow(request)
    next(gen)
    return request


def test_fetches_token_and_sets_bearer_header():
    auth = OvhOAuth2Auth(client_id="id", client_secret="secret")
    request = httpx.Request("GET", "https://eu.api.ovh.com/v1/ping")

    with patch("bbe2.services.mailing.httpx.post") as post:
        post.return_value = _token_response("tok-1", 3600)
        _run_flow(auth, request)

    assert request.headers["Authorization"] == "Bearer tok-1"
    post.assert_called_once()
    args, kwargs = post.call_args
    assert args[0] == OVH_OAUTH2_TOKEN_URL
    assert kwargs["data"]["grant_type"] == "client_credentials"
    assert kwargs["data"]["client_id"] == "id"
    assert kwargs["data"]["client_secret"] == "secret"


def test_reuses_cached_token_until_expiry():
    auth = OvhOAuth2Auth(client_id="id", client_secret="secret")

    with patch("bbe2.services.mailing.httpx.post") as post:
        post.return_value = _token_response("tok-1", 3600)
        _run_flow(auth, httpx.Request("GET", "https://eu.api.ovh.com/v1/a"))
        _run_flow(auth, httpx.Request("GET", "https://eu.api.ovh.com/v1/b"))

    post.assert_called_once()


def test_refreshes_token_when_expired():
    auth = OvhOAuth2Auth(client_id="id", client_secret="secret")

    with patch("bbe2.services.mailing.httpx.post") as post:
        # expires_in=0 => with the -60s safety margin the token is already stale.
        post.return_value = _token_response("tok-1", 0)
        _run_flow(auth, httpx.Request("GET", "https://eu.api.ovh.com/v1/a"))
        post.return_value = _token_response("tok-2", 3600)
        req = _run_flow(auth, httpx.Request("GET", "https://eu.api.ovh.com/v1/b"))

    assert post.call_count == 2
    assert req.headers["Authorization"] == "Bearer tok-2"
