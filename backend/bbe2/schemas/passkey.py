import base64
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_serializer
from webauthn.helpers.structs import CredentialDeviceType


class Passkey(BaseModel):

    credential_id: bytes

    sign_count: int
    transports: str
    device_type: CredentialDeviceType
    back_up: bool
    aaguid: str
    last_use_at: Optional[datetime] = None
    last_use_ip: Optional[str] = None
    last_use_ua: Optional[str] = None

    created_at: datetime

    @field_serializer("credential_id")
    def serialize_credential_id(self, credential_id: bytes, _info) -> str:
        return base64.urlsafe_b64encode(credential_id).decode()


class PasskeySignal(BaseModel):
    """Payload for ``PublicKeyCredential.signalAllAcceptedCredentials()``.

    Returned by the passkey DELETE endpoint so the client can tell the passkey
    provider (Keychain, Google Password Manager…) which credentials are still
    valid — the provider then deletes its copy of the removed one instead of
    keeping an orphan that would fail at the next login. All identifiers use
    base64url **without padding**, the encoding the WebAuthn Signal API
    expects (unlike ``Passkey.credential_id``, which keeps its historical
    padded form).
    """

    rp_id: str
    user_handle: str
    remaining_credential_ids: list[str]
