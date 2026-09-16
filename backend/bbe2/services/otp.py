"""One-time-code service shared by the flows that email a 6-digit code.

Used by the invitation email-verification flow (``utils/invitation.py``) and
the account-recovery login code (``api/v1/endpoints/auth.py``). Only the
SHA-256 hash of a code is ever stored.

The pure primitives (:func:`generate_otp`, :func:`hash_otp`, the constants)
are module-level functions. The attempt state machine lives on
:class:`OtpService`, which holds the request's DB session so it can own the
one transactional subtlety of the flows: a failed attempt must be committed
*before* the endpoint raises, because ``get_session`` rolls the transaction
back on exceptions — losing the burned attempt would give a guesser unlimited
tries. Callers no longer commit anything on failure paths.

Endpoints get the service through :data:`OtpDep`. FastAPI caches dependency
results per request, so the service's session is the *same* object as the
endpoint's own ``SessionDep`` — consuming the row and returning still commits
everything together.
"""

import hashlib
import secrets
from datetime import datetime, timezone
from enum import Enum
from typing import Annotated

from fastapi import Depends

from bbe2.dependencies import SessionDep
from bbe2.models.action_token import ActionTokenDB

OTP_MAX_AGE = 600  # 10 min
OTP_MAX_ATTEMPTS = 5


def hash_otp(code: str) -> str:
    """SHA-256 of an OTP code (never store the plaintext code)."""
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_otp() -> str:
    """Return a zero-padded 6-digit numeric code."""
    return f"{secrets.randbelow(1_000_000):06d}"


class OtpAttempt(Enum):
    """Outcome of one verification attempt against a stored code."""

    OK = "ok"
    EXHAUSTED = "exhausted"
    WRONG_CODE = "wrong_code"


class OtpService:
    """Attempt state machine of the emailed-code flows.

    Operates on the common payload keys of an :class:`ActionTokenDB` row:
    compare against ``code_hash``, burn one attempt on mismatch and revoke
    the row once ``attempts_left`` is exhausted — someone is guessing. Expiry
    is the token row's own TTL, checked by the caller when looking the row
    up; the code has no separate lifetime.

    Callers map each outcome to their own error semantics and consume the
    row on :attr:`OtpAttempt.OK` (the flows differ: revoke vs ``used_at``);
    the session commits with the request. Failed attempts are persisted here.
    """

    def __init__(self, session: SessionDep):
        self.session = session

    def verify(self, row: ActionTokenDB, code: str) -> OtpAttempt:
        """Run one verification attempt of ``code`` against ``row``'s payload.

        On failure the burned attempt (or revocation) is committed
        immediately: the caller is about to raise, which would otherwise
        roll it back and give a guesser unlimited attempts.
        """
        outcome = self._attempt(row, code)
        if outcome is not OtpAttempt.OK:
            self.session.commit()
        return outcome

    @staticmethod
    def _attempt(row: ActionTokenDB, code: str) -> OtpAttempt:
        payload = row.payload

        attempts_left = int(payload.get("attempts_left", 0))
        if attempts_left <= 0:
            row.revoked_at = datetime.now(timezone.utc)
            return OtpAttempt.EXHAUSTED

        if hash_otp(code) == payload.get("code_hash"):
            return OtpAttempt.OK

        # Reassign (not mutate) so SQLAlchemy tracks the JSON change.
        attempts_left -= 1
        row.payload = {**payload, "attempts_left": attempts_left}
        if attempts_left <= 0:
            row.revoked_at = datetime.now(timezone.utc)
        return OtpAttempt.WRONG_CODE


OtpDep = Annotated[OtpService, Depends(OtpService)]
