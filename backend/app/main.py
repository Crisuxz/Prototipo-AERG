from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health
from app.core.config import get_settings
from app.core.errors import DomainError, domain_error_handler, unhandled_error_handler
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
app.add_exception_handler(Exception, unhandled_error_handler)

app.include_router(health.router, prefix="/api")
