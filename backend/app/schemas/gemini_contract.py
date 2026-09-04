"""Contrato de salida estructurada de Gemini (PLAN_MAESTRO.md Parte 41/42).

`RESPONSE_JSON_SCHEMA` se envia a la API como `response_schema`; los modelos Pydantic
validan la respuesta ya recibida. Ninguno de estos valores se usa como puntuacion final:
son solo sugerencias que el `ScoringEngine` recalcula (Parte 46)."""

from pydantic import BaseModel


class CriterionEvaluationAI(BaseModel):
    criterion_id: str
    criterion_name: str
    selected_level: str
    suggested_score: float
    evidence: list[str] = []
    feedback: str
    improvement_suggestion: str = ""


class EvaluationBodyAI(BaseModel):
    criteria: list[CriterionEvaluationAI]
    general_feedback: str
    strengths: list[str] = []
    areas_for_improvement: list[str] = []
    warnings: list[str] = []


class GeminiEvaluationResponse(BaseModel):
    evaluation: EvaluationBodyAI


RESPONSE_JSON_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "evaluation": {
            "type": "object",
            "properties": {
                "criteria": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "criterion_id": {"type": "string"},
                            "criterion_name": {"type": "string"},
                            "selected_level": {"type": "string"},
                            "suggested_score": {"type": "number"},
                            "evidence": {"type": "array", "items": {"type": "string"}},
                            "feedback": {"type": "string"},
                            "improvement_suggestion": {"type": "string"},
                        },
                        "required": [
                            "criterion_id",
                            "criterion_name",
                            "selected_level",
                            "suggested_score",
                            "evidence",
                            "feedback",
                            "improvement_suggestion",
                        ],
                    },
                },
                "general_feedback": {"type": "string"},
                "strengths": {"type": "array", "items": {"type": "string"}},
                "areas_for_improvement": {"type": "array", "items": {"type": "string"}},
                "warnings": {"type": "array", "items": {"type": "string"}},
            },
            "required": [
                "criteria",
                "general_feedback",
                "strengths",
                "areas_for_improvement",
                "warnings",
            ],
        }
    },
    "required": ["evaluation"],
}
