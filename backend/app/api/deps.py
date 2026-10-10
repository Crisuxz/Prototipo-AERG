"""Dependencias FastAPI compartidas por los routers."""

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import DomainError
from app.core.security import decode_session_token, extract_bearer_token, is_shared_token
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
    if not is_shared_token(token, settings.auth_token):
        # Token de sesion emitido tras un launch LTI 1.3 (RS-01).
        user = db.get(User, decode_session_token(token, settings.session_secret))
        if user is None:
            raise DomainError("UNAUTHORIZED", "El usuario de la sesion ya no existe.", 401)
        return user

    user = db.query(User).filter(User.role == UserRole.TEACHER).order_by(User.id).first()
    if user is None:
        raise DomainError("UNAUTHORIZED", "No hay un docente configurado en el sistema.", 401)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_gemini_service(settings: AppSettings) -> GeminiService:
    """Aislada como dependencia para poder sustituirla por un doble en las pruebas."""
    return GeminiService(settings)


GeminiDep = Annotated[GeminiService, Depends(get_gemini_service)]
