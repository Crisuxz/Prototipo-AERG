"""Dependencias FastAPI compartidas por los routers."""

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import DomainError
from app.core.security import extract_bearer_token, verify_token
from app.db.session import get_db
from app.integrations.gemini.service import GeminiService
from app.models.enums import UserRole
from app.models.user import User

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def get_current_user(
    db: DbSession,
    settings: AppSettings,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    token = extract_bearer_token(authorization)
    verify_token(token, settings.auth_token)

    user = db.query(User).filter(User.role == UserRole.TEACHER).order_by(User.id).first()
    if user is None:
        raise DomainError("UNAUTHORIZED", "No hay un docente configurado en el sistema.", 401)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_gemini_service(settings: AppSettings) -> GeminiService:
    """Aislada como dependencia para poder sustituirla por un doble en las pruebas."""
    return GeminiService(settings)


GeminiDep = Annotated[GeminiService, Depends(get_gemini_service)]
