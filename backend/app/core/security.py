"""Autenticacion de prototipo (D8): un token compartido (`AUTH_TOKEN`) para el docente de
prueba o, tras un launch LTI 1.3, un token de sesion JWT HS256 que identifica al docente
del LMS (RS-01). El modelo `User` queda desacoplado del mecanismo."""

import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.core.errors import DomainError

BEARER_PREFIX = "Bearer "
SESSION_ALGORITHM = "HS256"


def extract_bearer_token(authorization_header: str | None) -> str:
    if not authorization_header or not authorization_header.startswith(BEARER_PREFIX):
        raise DomainError("UNAUTHORIZED", "Se requiere autenticacion.", 401)
    return authorization_header[len(BEARER_PREFIX) :].strip()


def is_shared_token(provided: str, expected: str) -> bool:
    return secrets.compare_digest(provided, expected)


def create_session_token(user_id: int, secret: str, ttl_hours: int) -> str:
    now = datetime.now(timezone.utc)
    claims = {"sub": str(user_id), "iat": now, "exp": now + timedelta(hours=ttl_hours)}
    return jwt.encode(claims, secret, algorithm=SESSION_ALGORITHM)


def decode_session_token(token: str, secret: str) -> int:
    """Devuelve el id del usuario de un token de sesion valido y no expirado."""
    try:
        claims = jwt.decode(
            token, secret, algorithms=[SESSION_ALGORITHM], options={"require": ["exp", "sub"]}
        )
        return int(claims["sub"])
    except (jwt.PyJWTError, ValueError) as exc:
        raise DomainError("UNAUTHORIZED", "Token de sesion invalido o expirado.", 401) from exc
