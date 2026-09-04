from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import evaluations, health, incidents, lms, rubrics, submissions
from app.core.config import get_settings
from app.core.errors import (
    DomainError,
    domain_error_handler,
    http_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.env)

app = FastAPI(title="Asistente de Evaluacion Automatizada con Retroalimentacion Generativa")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(DomainError, domain_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

app.include_router(health.router, prefix="/api")
app.include_router(rubrics.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(evaluations.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(lms.router, prefix="/api")
