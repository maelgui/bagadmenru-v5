from pydantic import AnyHttpUrl, BaseSettings


class Settings(BaseSettings):
    s3_endpoint: AnyHttpUrl
    s3_access_key_id: str
    s3_secret_access_key: str

    jwt_audience: str = "bbe2"
    jwt_issuer: AnyHttpUrl = "http://keycloak:8080/realms/bagadmenru"

    oidc_authorization_url: AnyHttpUrl
    oidc_token_url: AnyHttpUrl
    oidc_jwks_url: AnyHttpUrl

    swagger_client_id: str | None = "bbe2-swagger"

    class Config:
        env_file = ".env"


settings = Settings()
