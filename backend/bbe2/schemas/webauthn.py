"""WebAuthn wire-format schemas.

Pydantic mirrors of the JSON the browser WebAuthn API exchanges with the
backend, so the OpenAPI schema (and therefore the generated TypeScript
client) is properly typed instead of ``object``.

Field names are deliberately camelCase: this is the WebAuthn Level 2 JSON
convention (``PublicKeyCredentialCreationOptionsJSON`` /
``RegistrationResponseJSON``) produced by py_webauthn's ``options_to_json``
and consumed/emitted by @simplewebauthn/browser. Binary values (challenge,
credential ids, user id) travel base64url-encoded as strings.

The options models are VALIDATED FROM py_webauthn's own serialisation
(``Model.model_validate_json(options_to_json(...))``), so py_webauthn stays
the single source of truth for the encoding — these models only describe it.
A py_webauthn upgrade that adds a new field will fail loudly in tests (extra
fields are forbidden below) instead of being silently dropped from responses
by FastAPI's response_model filtering.
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class _WireModel(BaseModel):
    # forbid extras so a py_webauthn upgrade emitting new fields fails the
    # test suite instead of silently serving responses stripped of them.
    model_config = ConfigDict(extra="forbid")


class WebAuthnRp(_WireModel):
    name: str
    id: Optional[str] = None


class WebAuthnUser(_WireModel):
    id: str  # base64url of the PII-free passkey_user_id
    name: str
    displayName: str


class WebAuthnPubKeyCredParam(_WireModel):
    type: Literal["public-key"]
    alg: int


class WebAuthnCredentialDescriptor(_WireModel):
    id: str  # base64url credential id
    type: Literal["public-key"]
    transports: Optional[list[str]] = None


class WebAuthnAuthenticatorSelection(_WireModel):
    authenticatorAttachment: Optional[str] = None
    residentKey: Optional[str] = None
    requireResidentKey: Optional[bool] = None
    userVerification: Optional[str] = None


class PublicKeyCredentialCreationOptions(_WireModel):
    """Response of GET /webauthn/preregister (registration ceremony input)."""

    rp: WebAuthnRp
    user: WebAuthnUser
    challenge: str  # base64url
    pubKeyCredParams: list[WebAuthnPubKeyCredParam]
    timeout: Optional[int] = None
    excludeCredentials: Optional[list[WebAuthnCredentialDescriptor]] = None
    authenticatorSelection: Optional[WebAuthnAuthenticatorSelection] = None
    attestation: Optional[str] = None
    hints: Optional[list[str]] = None


class PublicKeyCredentialRequestOptions(_WireModel):
    """Response of GET /auth/login (authentication ceremony input)."""

    challenge: str  # base64url
    timeout: Optional[int] = None
    rpId: Optional[str] = None
    allowCredentials: Optional[list[WebAuthnCredentialDescriptor]] = None
    userVerification: Optional[str] = None


class AuthenticatorAttestationResponse(BaseModel):
    """The authenticator's attestation, as serialised by the browser.

    NOT extra-forbidden: browsers/@simplewebauthn add convenience fields
    (authenticatorData, publicKey, publicKeyAlgorithm, ...) that
    verify_registration_response does not need; unknown fields are ignored
    rather than rejected so newer browsers keep working.
    """

    clientDataJSON: str  # base64url
    attestationObject: str  # base64url
    transports: Optional[list[str]] = None


class RegistrationCredential(BaseModel):
    """Body of POST /webauthn/register (registration ceremony output).

    Ignores (rather than forbids) unknown extras for forward compatibility
    with newer browsers — py_webauthn only needs the fields declared here.
    """

    id: str
    rawId: str
    response: AuthenticatorAttestationResponse
    type: Literal["public-key"]
    authenticatorAttachment: Optional[str] = None
    clientExtensionResults: Optional[dict] = None
