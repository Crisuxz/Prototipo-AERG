from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuracion centralizada del backend, cargada desde variables de entorno (.env)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "dev"
    database_url: str = "sqlite:///./app.db"

    cors_origins: str = "http://localhost:5173"
    auth_token: str = "prototipo-dev-token"

    # Sesion del docente emitida tras un launch LTI 1.3 (RS-01).
    session_secret: str = "prototipo-dev-session-secret"
    session_ttl_hours: int = 8
    frontend_url: str = "http://localhost:5173"

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
    # AGS: endpoint OAuth2 de la plataforma y llave privada de la herramienta (fuera del repo).
    lti_token_url: str = ""
    lti_tool_private_key_path: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
