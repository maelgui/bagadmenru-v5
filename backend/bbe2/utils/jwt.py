"""JWT utils function."""

import time

import requests
from jose import jwt

from bbe2.config import settings


class JWTVerifier:
    """Does all the token verification using PyJWT"""

    def __init__(self, audience: str, issuer: str, lifespan: int = 600):
        self.audience = audience
        self.issuer = issuer
        self.last_update = None
        self.lifespan = lifespan
        self.load_keys()
        self.jwks = []

    def load_keys(self):
        """Loads keys from oidc provider."""
        try:
            req2 = requests.get(str(settings.oidc_jwks_url), timeout=10)
            req2.raise_for_status()
            self.jwks = req2.json()["keys"]
            print(self.jwks)
            self.last_update = time.monotonic()
        except requests.RequestException:
            pass

    def is_expired(self) -> bool:
        """Checks if current jwks are expired and need reloading."""
        return not self.jwks or (
            self.last_update is not None
            and self.lifespan > -1
            and time.monotonic() > self.last_update + self.lifespan
        )

    def get_keys(self):
        if self.is_expired():
            self.load_keys()
        return self.jwks

    def verify(self, token):
        claims = jwt.decode(
            token=token,
            key=self.get_keys(),
            audience=settings.jwt_audience,
            issuer=str(settings.jwt_issuer),
        )
        return claims
