"""Fixtures compartidas: base de datos SQLite temporal por test y cliente HTTP autenticado.

Gemini nunca se llama de verdad en la suite: `FakeGemini` sustituye a GeminiService con
respuestas deterministas (Parte 98)."""

import os
import tempfile
from dataclasses import dataclass, field

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_gemini_service
from app.core.config import Settings, get_settings
from app.db.base import Base
from app.db.session import get_db
from app.integrations.gemini.service import GeminiCallResult
from app.main import app
from app.models.enums import GenerationValidationStatus, LMSIntegrationType, UserRole, UserSource
from app.models.lms_integration import LMSIntegration
from app.models.user import User
from app.schemas.gemini_contract import GeminiEvaluationResponse

AUTH_HEADERS = {"Authorization": "Bearer test-token"}


@pytest.fixture
def temp_dir():
    with tempfile.TemporaryDirectory() as path:
        yield path


@pytest.fixture
def settings(temp_dir) -> Settings:
    return Settings(
        env="test",
        database_url="sqlite://",
        auth_token="test-token",
        gemini_api_key="test-key",
        gemini_model="gemini-test",
        max_upload_mb=1,
        max_submission_chars=5000,
        upload_dir=os.path.join(temp_dir, "uploads"),
    )


@pytest.fixture
def db_session(temp_dir):
    engine = create_engine("sqlite:///" + os.path.join(temp_dir, "test.db").replace("\\", "/"))
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autocommit=False, autoflush=False)()

    session.add(
        User(
            id=1,
            name="Docente de prueba",
            email="docente@prototipo.local",
            role=UserRole.TEACHER,
            source=UserSource.LOCAL,
        )
    )
    session.add(
        LMSIntegration(id=1, name="Simulador LMS", type=LMSIntegrationType.SIMULATOR, config={})
    )
    session.commit()

    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def teacher(db_session) -> User:
    return db_session.get(User, 1)


@dataclass
class FakeGemini:
    """Doble de GeminiService: devuelve, en orden, las respuestas que el test programe.
    A partir de la ultima, la repite (para probar reintentos que vuelven a fallar)."""

    responses: list = field(default_factory=list)
    calls: int = 0
    model_name: str = "gemini-test"

    def evaluate(self, context):
        self.calls += 1
        index = min(self.calls - 1, len(self.responses) - 1)
        return self.responses[index]


def ai_criterion(criterion_id, name: str, level: str, score: float) -> dict:
    return {
        "criterion_id": str(criterion_id),
        "criterion_name": name,
        "selected_level": level,
        "suggested_score": score,
        "evidence": ["Cita textual del trabajo"],
        "feedback": "Retroalimentacion del criterio " + name + ".",
        "improvement_suggestion": "Sugerencia de mejora.",
    }


def valid_result(criteria: list[dict], general_feedback: str = "Buen trabajo en general.") -> GeminiCallResult:
    raw = {
        "evaluation": {
            "criteria": criteria,
            "general_feedback": general_feedback,
            "strengths": ["Estructura clara"],
            "areas_for_improvement": ["Profundizar el analisis"],
            "warnings": [],
        }
    }
    return GeminiCallResult(
        success=True,
        payload=GeminiEvaluationResponse.model_validate(raw),
        raw_response=raw,
        status=GenerationValidationStatus.VALID,
        errors=[],
        latency_ms=120,
        model_name="gemini-test",
    )


def failed_result(status: GenerationValidationStatus, message: str) -> GeminiCallResult:
    return GeminiCallResult(
        success=False,
        payload=None,
        raw_response=None,
        status=status,
        errors=[message],
        latency_ms=10,
        model_name="gemini-test",
    )


@pytest.fixture
def fake_gemini() -> FakeGemini:
    return FakeGemini()


@pytest.fixture
def client(db_session, settings, fake_gemini):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_gemini_service] = lambda: fake_gemini
    with TestClient(app) as test_client:
        test_client.headers.update(AUTH_HEADERS)
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def rubric_payload() -> dict:
    """Rubrica de 3 criterios con pesos 40/30/30 (caso TF-01 de la matriz funcional)."""
    def levels() -> list[dict]:
        return [
            {"name": "Insuficiente", "description": "No cumple", "score": 0, "order": 1},
            {"name": "Suficiente", "description": "Cumple parcialmente", "score": 2, "order": 2},
            {"name": "Excelente", "description": "Cumple plenamente", "score": 4, "order": 3},
        ]

    return {
        "name": "Rubrica de ensayo argumentativo",
        "description": "Evalua un ensayo breve",
        "instructions": "Considera el nivel de un curso introductorio.",
        "criteria": [
            {"name": "Argumentacion", "description": None, "weight": 40, "order": 1, "levels": levels()},
            {"name": "Estructura", "description": None, "weight": 30, "order": 2, "levels": levels()},
            {"name": "Redaccion", "description": None, "weight": 30, "order": 3, "levels": levels()},
        ],
    }


@pytest.fixture
def published_rubric(client, rubric_payload) -> dict:
    created = client.post("/api/rubrics", json=rubric_payload).json()
    return client.post("/api/rubrics/" + str(created["id"]) + "/publish").json()


@pytest.fixture
def submission(client) -> dict:
    files = {"file": ("ensayo.txt", b"Este es el ensayo del estudiante sobre el tema.", "text/plain")}
    response = client.post(
        "/api/submissions", files=files, data={"student_identifier": "Estudiante 1"}
    )
    return response.json()
