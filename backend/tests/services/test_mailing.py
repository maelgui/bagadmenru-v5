import asyncio
from unittest.mock import AsyncMock, patch

from bbe2.config import Settings
from bbe2.services import mailing


def _settings(configured=True):
    data = {
        "database_url": "sqlite://",
        "s3_endpoint": "https://x",
        "s3_access_key_id": "x",
        "s3_secret_access_key": "x",
        "s3_bucket_name": "x",
        "token_secret_key": "x",
        "jwt_secret_key": "x",
    }
    if configured:
        data.update(
            ovh_client_id="cid",
            ovh_client_secret="csecret",
        )
    return Settings.model_validate(data)


def _mock_helper(subscribers):
    helper = AsyncMock()
    helper.retrieve_subscriber = AsyncMock(return_value=subscribers)
    helper.add_subscriber = AsyncMock()
    helper.delete_subscriber = AsyncMock()
    helper.__aenter__ = AsyncMock(return_value=helper)
    helper.__aexit__ = AsyncMock(return_value=False)
    return helper


def test_compute_diff_unconfigured():
    diff = asyncio.run(
        mailing.compute_diff(
            _settings(configured=False), "pupitres", mailing.DOMAIN, {"a@x.fr"}
        )
    )
    assert diff.configured is False
    assert diff.in_sync is True
    assert diff.expected == ["a@x.fr"]


def test_compute_diff_reports_delta():
    helper = _mock_helper(["old@x.fr"])
    with patch("bbe2.services.mailing._helper", return_value=helper):
        diff = asyncio.run(
            mailing.compute_diff(_settings(), "pupitres", mailing.DOMAIN, {"new@x.fr"})
        )
    assert diff.configured is True
    assert diff.to_add == ["new@x.fr"]
    assert diff.to_remove == ["old@x.fr"]
    assert diff.in_sync is False


def test_sync_adds_and_removes():
    helper = _mock_helper(["old@x.fr"])
    with patch("bbe2.services.mailing._helper", return_value=helper):
        diff = asyncio.run(
            mailing.sync_mailing_list(
                _settings(), "pupitres", mailing.DOMAIN, {"new@x.fr"}
            )
        )
    helper.add_subscriber.assert_awaited_once_with(
        domain=mailing.DOMAIN, name="pupitres", email="new@x.fr"
    )
    helper.delete_subscriber.assert_awaited_once_with(
        domain=mailing.DOMAIN, name="pupitres", email="old@x.fr"
    )
    assert diff.in_sync is True
