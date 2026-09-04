from pydantic import BaseModel, ConfigDict


class ApiModel(BaseModel):
    """Base de todos los schemas de respuesta: permite construirlos desde objetos ORM."""

    model_config = ConfigDict(from_attributes=True)


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody
