from fastapi import Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Error de dominio con codigo interno estable para el frontend (ver PLAN_MAESTRO.md Parte 40)."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "Ocurrio un error interno inesperado."}},
    )
