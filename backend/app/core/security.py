"""Autenticacion de prototipo (D8): un unico docente de prueba identificado por un token
simple de sesion local. El modelo `User` queda desacoplado del mecanismo, de modo que
LTI 1.3 (OIDC) pueda sustituirlo sin rediseniar el dominio."""

import secrets

from app.core.errors import DomainError

BEARER_PREFIX = "Bearer "


def extract_bearer_token(authorization_header: str | None) -> str:
    if not authorization_header or not authorization_header.startswith(BEARER_PREFIX):
        raise DomainError("UNAUTHORIZED", "Se requiere autenticacion.", 401)
    return authorization_header[len(BEARER_PREFIX) :].strip()


def verify_token(provided: str, expected: str) -> None:
    if not secrets.compare_digest(provided, expected):
        raise DomainError("UNAUTHORIZED", "Token de sesion invalido.", 401)
