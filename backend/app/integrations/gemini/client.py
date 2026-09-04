"""Wrapper delgado sobre el SDK google-genai. Es el unico punto del sistema que conoce
el SDK; traduce cualquier fallo a un resultado normalizado para GeminiService."""

import logging
import time
from dataclasses import dataclass

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.schemas.gemini_contract import GeminiEvaluationResponse

logger = logging.getLogger(__name__)


@dataclass
class RawGenerationResult:
    text: str | None
    latency_ms: int
    error_code: str | None = None
    error_message: str | None = None


class GeminiClient:
    def __init__(self, api_key: str, model: str, timeout_seconds: int):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def _build_client(self) -> genai.Client:
        return genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(timeout=self.timeout_seconds * 1000),
        )

    def generate(self, prompt: str, system_instruction: str) -> RawGenerationResult:
        if not self.api_key:
            return RawGenerationResult(
                text=None,
                latency_ms=0,
                error_code="HTTP_ERROR",
                error_message="GEMINI_API_KEY no esta configurada.",
            )

        started = time.monotonic()
        try:
            # El cliente se guarda en una variable: si se encadena la llamada sin
            # mantener una referencia viva, el recolector de basura puede cerrar su
            # cliente HTTP interno mientras la peticion aun esta en curso.
            client = self._build_client()
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=GeminiEvaluationResponse,
                    temperature=0.2,
                ),
            )
        except genai_errors.APIError as exc:
            # El mensaje del SDK puede incluir detalles del request; solo se conserva el codigo.
            logger.warning("Gemini respondio con error HTTP %s", getattr(exc, "code", "desconocido"))
            return RawGenerationResult(
                text=None,
                latency_ms=self._elapsed(started),
                error_code="HTTP_ERROR",
                error_message="La API de Gemini respondio con un error.",
            )
        except TimeoutError:
            return RawGenerationResult(
                text=None,
                latency_ms=self._elapsed(started),
                error_code="TIMEOUT",
                error_message="La API de Gemini no respondio dentro del tiempo limite.",
            )
        except Exception as exc:
            message = str(exc).lower()
            code = "TIMEOUT" if "timeout" in message or "timed out" in message else "HTTP_ERROR"
            logger.warning("Fallo la llamada a Gemini (%s)", code)
            return RawGenerationResult(
                text=None,
                latency_ms=self._elapsed(started),
                error_code=code,
                error_message="No fue posible completar la llamada a Gemini.",
            )

        latency_ms = self._elapsed(started)

        if getattr(response, "prompt_feedback", None) and getattr(
            response.prompt_feedback, "block_reason", None
        ):
            return RawGenerationResult(
                text=None,
                latency_ms=latency_ms,
                error_code="BLOCKED",
                error_message="Gemini bloqueo la solicitud por sus filtros de contenido.",
            )

        return RawGenerationResult(text=response.text, latency_ms=latency_ms)

    @staticmethod
    def _elapsed(started: float) -> int:
        return int((time.monotonic() - started) * 1000)
