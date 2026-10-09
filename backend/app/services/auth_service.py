"""Acceso del docente mediante LTI 1.3 (RS-01).

Tras validar el `id_token` del LMS, el docente se identifica por el claim `sub`
(`User.external_id`, `source=LMS`). Solo los roles Instructor o Administrator del LTI
obtienen acceso; un estudiante que lance la herramienta recibe 403."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import DomainError
from app.core.security import create_session_token
from app.integrations.lms.lti13_adapter import CLAIM_PREFIX
from app.models.enums import UserRole, UserSource
from app.models.user import User

ROLES_CLAIM = CLAIM_PREFIX + "roles"
ALLOWED_ROLES = {"Instructor": UserRole.TEACHER, "Administrator": UserRole.ADMIN}


def lti_role(claims: dict) -> UserRole | None:
    """Los roles LTI son URIs del vocabulario LIS (`...membership#Instructor`); basta el
    fragmento final para decidir."""
    names = {role.rsplit("#", 1)[-1] for role in claims.get(ROLES_CLAIM, [])}
    return next((role for lti_name, role in ALLOWED_ROLES.items() if lti_name in names), None)


class AuthService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings

    def login_from_lti(self, claims: dict) -> User:
        role = lti_role(claims)
        if role is None:
            raise DomainError(
                "FORBIDDEN", "Solo los docentes del curso pueden usar el asistente.", 403
            )

        subject = str(claims["sub"])
        user = self.db.scalars(select(User).where(User.external_id == subject)).first()
        name = claims.get("name") or claims.get("given_name") or "Docente LMS " + subject
        email = claims.get("email") or subject + "@lti.local"
        if user is None:
            user = User(external_id=subject, source=UserSource.LMS, role=role, name=name, email=email)
            self.db.add(user)
        else:
            user.name, user.email, user.role = name, email, role
        self.db.commit()
        self.db.refresh(user)
        return user

    def issue_session_token(self, user: User) -> str:
        return create_session_token(
            user.id, self.settings.session_secret, self.settings.session_ttl_hours
        )
