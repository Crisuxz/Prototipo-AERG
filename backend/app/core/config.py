from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuracion centralizada del backend, cargada desde variables de entorno (.env)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "dev"
    database_url: str = "sqlite:///./app.db"

    cors_origins: str = "http://localhost:5173"
    auth_token: str = "prototipo-dev-token"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: int = 30

    max_upload_mb: int = 10
    max_submission_chars: int = 200_000
    upload_dir: str = "uploads"

    # LTI 1.3 (Nivel 2). Vacios mientras no haya un LMS certificado configurado.
    lti_issuer: str = ""
    lti_client_id: str = ""
    lti_deployment_id: str = ""
    lti_jwks_url: str = ""
    lti_auth_login_url: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
