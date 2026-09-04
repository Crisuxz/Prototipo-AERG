"""Parseo de la respuesta cruda de Gemini al contrato Pydantic (Parte 43, pasos 1 y 5)."""

import json
from dataclasses import dataclass

from pydantic import ValidationError

from app.models.enums import GenerationValidationStatus
from app.schemas.gemini_contract import GeminiEvaluationResponse


@dataclass
class ParseResult:
    payload: GeminiEvaluationResponse | None
    raw_json: dict | None
    status: GenerationValidationStatus
    errors: list[str]


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.rstrip().endswith("```"):
            cleaned = cleaned.rstrip()[:-3]
    return cleaned.strip()


def parse(raw_text: str | None) -> ParseResult:
    if not raw_text or not raw_text.strip():
        return ParseResult(
            payload=None,
            raw_json=None,
            status=GenerationValidationStatus.EMPTY_RESPONSE,
            errors=["La respuesta del modelo llego vacia."],
        )

    try:
        raw_json = json.loads(_strip_code_fences(raw_text))
    except json.JSONDecodeError as exc:
        return ParseResult(
            payload=None,
            raw_json={"raw_text": raw_text[:4000]},
            status=GenerationValidationStatus.INVALID_SCHEMA,
            errors=["La respuesta no es JSON valido: " + exc.msg],
        )

    if not isinstance(raw_json, dict):
        return ParseResult(
            payload=None,
            raw_json={"raw_text": raw_text[:4000]},
            status=GenerationValidationStatus.INVALID_SCHEMA,
            errors=["Se esperaba un objeto JSON en la raiz de la respuesta."],
        )

    try:
        payload = GeminiEvaluationResponse.model_validate(raw_json)
    except ValidationError as exc:
        errors = [
            ".".join(str(part) for part in error["loc"]) + ": " + error["msg"]
            for error in exc.errors()
        ]
        return ParseResult(
            payload=None,
            raw_json=raw_json,
            status=GenerationValidationStatus.INVALID_SCHEMA,
            errors=errors,
        )

    content_errors: list[str] = []
    if not payload.evaluation.general_feedback.strip():
        content_errors.append("general_feedback no puede estar vacio.")
    for criterion in payload.evaluation.criteria:
        if not criterion.feedback.strip():
            content_errors.append(
                "El feedback del criterio " + criterion.criterion_id + " esta vacio."
            )
    if content_errors:
        return ParseResult(
            payload=None,
            raw_json=raw_json,
            status=GenerationValidationStatus.INVALID_SCHEMA,
            errors=content_errors,
        )

    return ParseResult(
        payload=payload,
        raw_json=raw_json,
        status=GenerationValidationStatus.VALID,
        errors=[],
    )
