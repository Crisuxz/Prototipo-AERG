# Asistente de Evaluación Automatizada con Retroalimentación Generativa

Prototipo de tesis que apoya al docente en la evaluación de trabajos escritos: la IA
(Google Gemini) **propone** una evaluación por criterios a partir de una rúbrica, el
backend **valida y recalcula** todo puntaje de forma determinista, y el docente
**revisa, ajusta y aprueba**. Ninguna calificación se emite sin aprobación humana.

Documento rector: [`PLAN_MAESTRO.md`](PLAN_MAESTRO.md). Bitácora de avance:
[`Progreso.md`](Progreso.md).

## Documentación

| Documento | Contenido |
|---|---|
| [architecture.md](architecture.md) | Capas, componentes y flujos principales |
| [data-model.md](data-model.md) | Entidades, relaciones y reglas de integridad |
| [api.md](api.md) | Endpoints, contratos y códigos de error |
| [prompt-versions.md](prompt-versions.md) | Historial de versiones del prompt |
| [test-plan.md](test-plan.md) | Estrategia, matrices de pruebas y trazabilidad |
| [user-manual.md](user-manual.md) | Manual del docente |
| [decisions.md](decisions.md) | Decisiones técnicas adoptadas |
| [deployment.md](deployment.md) | Despliegue, variables y operación |

## Requisitos

- Python 3.14
- Node.js 22 o superior
- Una API key de Google Gemini (para uso real; las pruebas usan un doble determinista)

## Instalación y arranque

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows;  source .venv/bin/activate en Linux/macOS
pip install -r requirements.txt
cp .env.example .env          # y coloca tu GEMINI_API_KEY
alembic upgrade head          # crea el esquema y los datos semilla
uvicorn app.main:app --reload
```

El backend queda en `http://127.0.0.1:8000`. `GET /api/health` responde sin
autenticación; el resto de endpoints requieren
`Authorization: Bearer <AUTH_TOKEN>`. La documentación OpenAPI interactiva está en
`http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_TOKEN debe coincidir con AUTH_TOKEN del backend
npm run dev
```

La SPA queda en `http://localhost:5173` y Vite hace proxy de `/api` al backend.

## Pruebas

```bash
cd backend
.venv/Scripts/python -m pytest        # unitarias, integración, funcionales y seguridad
```

Las pruebas nunca llaman a Gemini: `GeminiService` se sustituye por un doble
determinista mediante la dependencia `get_gemini_service` (ver `tests/conftest.py`).

## Estructura del repositorio

```
backend/    API FastAPI, dominio, servicios, integraciones (Gemini y LMS) y pruebas
frontend/   SPA React + Vite + Tailwind (6 pantallas)
docs/       Documentación del prototipo y de la tesis
deployment/ Configuración de despliegue de un solo nodo
```
