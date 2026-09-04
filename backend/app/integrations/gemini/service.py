"""GeminiService: unica puerta de entrada a la IA (Parte 38).

Nunca deja escapar una excepcion del SDK: siempre devuelve un GeminiCallResult
normalizado para que EvaluationService decida que hacer."""

from dataclasses import dataclass, field

from app.core.config import Settings
from app.integrations.gemini.client import GeminiClient
from app.integrations.gemini.prompt_builder import (
    PROMPT_VERSION,
    SYSTEM_INSTRUCTION,
    EvaluationContext,
    build,
)
from app.integrations.gemini.response_parser import parse
from app.models.enums import GenerationValidationStatus
from app.schemas.gemini_contract import GeminiEvaluationResponse


@dataclass
class GeminiCallResult:
    success: bool
    payload: GeminiEvaluationResponse | None
    raw_response: dict | None
    status: GenerationValidationStatus
    errors: list[str] = field(default_factory=list)
    latency_ms: int = 0
    prompt_version: str = PROMPT_VERSION
    model_name: str = ""


class GeminiService:
    def __init__(self, settings: Settings):
        self.model_name = settings.gemini_model
        self.client = GeminiClient(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
            timeout_seconds=settings.gemini_timeout_seconds,
        )

    def evaluate(self, context: EvaluationContext) -> GeminiCallResult:
        prompt = build(context)
        raw = self.client.generate(prompt, SYSTEM_INSTRUCTION)

        if raw.error_code is not None:
            return GeminiCallResult(
                success=False,
                payload=None,
                raw_response=None,
                status=GenerationValidationStatus(raw.error_code),
                errors=[raw.error_message or "Fallo la llamada a Gemini."],
                latency_ms=raw.latency_ms,
                model_name=self.model_name,
            )

        parsed = parse(raw.text)
        return GeminiCallResult(
            success=parsed.status == GenerationValidationStatus.VALID,
            payload=parsed.payload,
            raw_response=parsed.raw_json,
            status=parsed.status,
            errors=parsed.errors,
            latency_ms=raw.latency_ms,
            model_name=self.model_name,
        )
