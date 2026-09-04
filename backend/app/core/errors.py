import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

HTTP_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "FILE_TOO_LARGE",
    422: "VALIDATION_ERROR",
}


class DomainError(Exception):
    """Error de dominio con codigo interno estable para el frontend (ver PLAN_MAESTRO.md Parte 40)."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = HTTP_ERROR_CODES.get(exc.status_code, "HTTP_ERROR")
    return error_response(exc.status_code, code, str(exc.detail))


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = "; ".join(
        ".".join(str(part) for part in error["loc"][1:]) + ": " + error["msg"]
        for error in exc.errors()
    )
    return error_response(422, "VALIDATION_ERROR", "Datos de entrada invalidos. " + details)


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # La traza se registra en el log del servidor pero nunca se expone al cliente (Parte 96).
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return error_response(500, "INTERNAL_ERROR", "Ocurrio un error interno inesperado.")
