# Progreso

## Sesión — Iteración 0 (Preparación)

Fecha: 2026-09-02

Estado del repositorio al iniciar esta sesión: vacío (solo `README.md`, `CLAUDE.md` y `docs/PLAN_MAESTRO.md`, sin código).

Esta sesión ejecutó los pasos 1–4 del **orden definitivo de implementación** (`docs/PLAN_MAESTRO.md`, Parte 18) — la Iteración 0 completa. **Nada de lo descrito aquí está commiteado en git todavía**; son archivos nuevos sin trackear en el árbol de trabajo.

### Backend (`backend/`)

- Entorno virtual `.venv` (Python 3.14) con dependencias instaladas y congeladas en `requirements.txt`: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `alembic`, `pydantic`, `pydantic-settings`, `pypdf`, `python-docx`, `python-multipart`, `httpx`, `pytest`, `google-genai`.
- Estructura de carpetas completa según Parte 3/18 del plan: `app/api/routes`, `app/core`, `app/db` (+ `migrations` con Alembic inicializado), `app/integrations/{gemini,lms}`, `app/models`, `app/repositories`, `app/schemas`, `app/services`, `app/utils`, `tests/{unit,integration,functional}`. Todas con `__init__.py`; la mayoría aún vacías (se llenan en iteraciones siguientes).
- Archivos con contenido real:
  - `app/core/config.py` — `Settings` (pydantic-settings) leyendo `.env`.
  - `app/core/logging.py` — logging básico a stdout.
  - `app/core/errors.py` — `DomainError` + exception handlers, contrato de error `{"error": {"code", "message"}}`.
  - `app/db/base.py` — `Base` declarativa SQLAlchemy.
  - `app/db/session.py` — engine + `SessionLocal` + `get_db()`.
  - `app/api/routes/health.py` — `GET /api/health`.
  - `app/main.py` — arma FastAPI, CORS, exception handlers, incluye router de health.
  - `app/db/migrations/env.py` — editado para leer `Settings.database_url` y usar `Base.metadata` como `target_metadata` (listo para autogenerar migraciones cuando existan modelos).
  - `alembic.ini` — `sqlalchemy.url` apuntando a `sqlite:///./app.db` (valor real se resuelve en `env.py`).
- `.env.example` y `.env` (este último no se commitea, ya está en `.gitignore`) con las variables: `ENV`, `DATABASE_URL`, `CORS_ORIGINS`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT_SECONDS`, `MAX_UPLOAD_MB`, `MAX_SUBMISSION_CHARS`.
- `README.md` con instrucciones de arranque.

### Frontend (`frontend/`)

- Proyecto generado con `npm create vite@latest -- --template react-ts`, más `@tailwindcss/vite` (Tailwind v4), `react-router-dom`, `axios`.
- Se limpió el scaffold por defecto (se borraron `App.tsx`, `App.css` y assets de ejemplo del template).
- `vite.config.ts` — agrega el plugin de Tailwind.
- `src/index.css` — solo `@import "tailwindcss";`.
- `src/services/apiClient.ts` — instancia Axios centralizada con interceptor que normaliza errores HTTP al contrato `{code, message}` del backend.
- `src/layouts/AppLayout.tsx` — layout con barra lateral de navegación (Dashboard, Evaluar trabajo, Rúbricas, Historial).
- `src/pages/` — 6 páginas placeholder (una por pantalla oficial del plan): `DashboardPage`, `EvaluateWorkPage`, `ReviewEvaluationPage`, `RubricsPage`, `RubricDetailPage`, `HistoryPage`.
- `src/router/index.tsx` — rutas con `createBrowserRouter` (`/`, `/evaluar`, `/evaluaciones/:id/revision`, `/rubricas`, `/rubricas/:id`, `/historial`).
- `src/main.tsx` — renderiza `RouterProvider`.
- Carpetas vacías creadas para uso futuro: `components/`, `features/{rubrics,evaluations,dashboard}/`, `hooks/`, `types/`, `utils/`.
- `README.md` con instrucciones de arranque.

### Raíz del repositorio

- `.gitignore` — excluye `backend/.venv/`, `backend/__pycache__/`, `backend/.env`, `backend/*.db`, `backend/uploads/`, `backend/.pytest_cache/`, `frontend/node_modules/`, `frontend/dist/`, `frontend/.env`, `.DS_Store`, `*.log`.
- `deployment/README.md` — placeholder documentando qué contendrá esta carpeta en iteraciones posteriores (proxy inverso, variables de despliegue, arranque en producción).

### Verificación realizada

- `tsc -b --noEmit` sin errores; `npm run build` exitoso (Tailwind se compila correctamente).
- Backend y frontend levantados en paralelo: `GET http://127.0.0.1:8000/api/health` → `200 {"status":"ok"}`; `GET http://localhost:5173/` → `200`.
- Ambos procesos de verificación se detuvieron al terminar; no quedaron servidores corriendo ni archivos temporales (`app.db`, logs, PIDs).

### Cómo levantar el proyecto para probarlo

```bash
# Backend
cd backend
./.venv/Scripts/activate   # o: source .venv/Scripts/activate en Git Bash
uvicorn app.main:app --reload
# -> http://127.0.0.1:8000/api/health y http://127.0.0.1:8000/docs

# Frontend (otra terminal)
cd frontend
npm run dev
# -> http://localhost:5173
```

### Estado de git

Todo lo anterior existe en el árbol de trabajo pero **no está commiteado** (`git status` muestra `backend/`, `frontend/`, `deployment/`, `.gitignore` como untracked). Se decidió explícitamente no subir cambios a git; queda pendiente que el usuario revise y decida cuándo commitear.

### Siguiente paso (Iteración 1 del plan)

Según `docs/PLAN_MAESTRO.md`, Parte 18, pasos 5–9: modelar en SQLAlchemy `User`, `Rubric`, `RubricCriterion`, `PerformanceLevel`; generar la primera migración Alembic con datos semilla (usuario docente de prueba); implementar `RubricService` con validación de pesos/niveles; exponer `/api/rubrics*`; conectar las pantallas "Rúbricas" y "Detalle/Edición de Rúbrica" a la API real.

---

## Sesión — Iteraciones 1–9 (pasos 5–35 del plan)

Fecha: 2026-09-03

Estado al iniciar: la Iteración 0 ya estaba commiteada (`1f9ca04`). Esta sesión ejecutó los pasos **5 a 35** del orden definitivo de implementación (`docs/PLAN_MAESTRO.md`, Parte 18), es decir, el resto del plan maestro.

### Backend

- **Dominio y migraciones (pasos 5–6).** Todas las entidades de la Parte 4 en `app/models/`: `User`, `Assignment`, `Rubric`, `RubricCriterion`, `PerformanceLevel`, `Submission`, `Evaluation`, `EvaluationCriterionResult`, `EvaluationGeneration`, `EvaluationRevision`, `IncidentLog`, `LMSIntegration`, más `enums.py` y `mixins.py`. Dos migraciones Alembic: esquema inicial (`b1e466eb9fff`) y datos semilla (`5c137c3ca63b`: docente de prueba e integración `SIMULATOR` activa).
- **Rúbricas (pasos 7–8).** `RubricService` con las reglas de publicación (pesos = 100, mínimo dos niveles por criterio, órdenes únicos), versionado incremental y `RUBRIC_IN_USE` al intentar borrar una rúbrica ya usada. Endpoints `/api/rubrics*` completos.
- **Ingesta de documentos (pasos 10–12).** `SubmissionService` + `DocumentProcessingService`: validación de extensión y de contenido real del archivo, límite de tamaño, extracción con pypdf/python-docx, normalización, truncado a `MAX_SUBMISSION_CHARS` y nombre de almacenamiento generado por el backend. Cada fallo deja un `IncidentLog`.
- **Integración con Gemini (pasos 14–17).** `app/integrations/gemini/`: `prompt_builder` (cinco bloques + cláusula anti-inyección + bloque 6 de corrección), `client` (SDK `google-genai` con `response_mime_type` y `response_schema`), `response_parser` y `service`. `PROMPT_VERSION = "v1"`.
- **Ciclo de evaluación (pasos 18–20).** `EvaluationService` orquesta: snapshot inmutable de rúbrica, llamada al modelo, pipeline de validación (esquema → criterios exactos del snapshot → nivel existente → puntaje en rango → feedback no vacío), reintento **único** y sólo ante `INVALID_SCHEMA`/`INVALID_CRITERIA`, y recálculo determinista con `ScoringEngine`. Ningún número del modelo se usa como calificación.
- **Revisión, aprobación e historial (pasos 25–30).** `review` registra una `EvaluationRevision` por campo modificado; `regenerate` añade la generación N+1 sin borrar las anteriores; `approve` congela la evaluación y la envía al adaptador LMS. Después de aprobar, toda mutación responde 409.
- **LMS (pasos 28–30).** `LMSAdapter` con `SimulatorAdapter` (Nivel 1) y `LTI13Adapter` (Nivel 2: redirect de login OIDC, validación de firma/`iss`/`aud`/`deployment_id`/expiración del `id_token`, y envío de calificación como Score de AGS). Endpoints `/api/lms/*` y `/api/lti/*`.
- **Incidencias (paso 21).** `IncidentService` con redacción de valores sensibles y `GET /api/incidents` con filtros.

### Frontend

Las 6 pantallas oficiales completas y conectadas a la API real: Dashboard, Rúbricas, Detalle de Rúbrica, Evaluar Trabajo, Revisión de Evaluación e Historial. `src/types/index.ts` refleja 1:1 los schemas del backend; `apiClient` adjunta el token en un interceptor de petición y normaliza errores en uno de respuesta; `useAsyncData` y sus derivados exponen `idle | loading | success | error | empty` en todas las vistas. Componentes reutilizables: `FileUploader` (drag & drop), `ScoreEditor`, `CriterionReviewCard`, `RubricCriterionEditor`, `PerformanceLevelEditor`, `HistoryTable`, `Pagination`, `StatusBadge`, `Modal`, `ConfirmDialog`, `EmptyState`, `Loader` y `ToastNotifications` (con traducción de los códigos de error del backend a mensajes para el docente). `vite.config.ts` hace proxy de `/api` al backend en desarrollo.

### Pruebas (pasos 32–33)

**109 pruebas, todas en verde** (`pytest tests -q` → `109 passed`):

- 30 unitarias (`ScoringEngine`, validación de rúbricas, parseo y validación de la respuesta de Gemini, construcción del prompt).
- 50 de integración (rúbricas, ingesta de documentos, ciclo completo de evaluación, LMS y LTI 1.3 con claves RSA locales).
- 11 funcionales nombradas TF-01…TF-11 para citarse directamente en el capítulo de resultados.
- 18 de seguridad y prompt injection.

Gemini nunca se llama: se inyecta un doble determinista vía `get_gemini_service`, lo que permite forzar timeouts, errores HTTP, JSON roto, criterios inventados y puntajes fuera de rango, y contar las llamadas para verificar la política de reintento.

### Documentación y despliegue (paso 34)

- `docs/`: `README.md`, `architecture.md`, `data-model.md`, `api.md`, `prompt-versions.md`, `test-plan.md` (con las matrices de la Parte 13 y la trazabilidad completa de la Parte 17), `user-manual.md`, `decisions.md` y `deployment.md`.
- `deployment/`: `.env.production.example`, `aerg.service` (systemd), `Caddyfile`, `nginx.conf` y un `README.md` que sustituye al placeholder.

### Checklist final (Parte 19, paso 35)

Backend, base de datos, IA, seguridad, LMS, pruebas y documentación: **completos y verificados**. Frontend: las 6 pantallas, los estados de petición, la validación ligera de UX, el `apiClient` centralizado y los tipos TS están completos; `npm run build` (con `tsc -b`) pasa limpio y `oxlint` sólo emite advertencias.

Quedan tres puntos abiertos, todos documentados en `docs/test-plan.md`:

1. **Pruebas de frontend (D10):** Vitest + React Testing Library no están implementadas. La verificación actual es `tsc -b` más `oxlint`.
2. **Usabilidad (RNF-06/07):** el instrumento está diseñado en la Parte 14 del plan; el tamaño de muestra sigue pendiente de definición por el investigador (dato metodológico que el plan marca como pendiente).
3. **Despliegue verificado desde cero y LTI 1.3 end-to-end:** el procedimiento de instalación está escrito y es reproducible, pero no se ha ejecutado en un servidor Linux real, y la validación de LTI se hizo contra claves RSA generadas en la prueba, no contra un LMS certificado. Ambos dependen de entornos no disponibles en esta sesión.

### Estado de git

Nada de esta sesión está commiteado. Todo vive en el árbol de trabajo, a la espera de que el usuario revise y decida cuándo subirlo.

---

## Sesión — Puesta en marcha y corrección del cliente Gemini

Fecha: 2026-09-03

Estado al iniciar: la Iteración 0 (`1f9ca04`) seguía siendo el único commit en el repositorio; el resto del plan maestro (sesión anterior) permanecía sin commitear. Esta sesión arrancó backend y frontend por primera vez con una clave real de Gemini y depuró los fallos que aparecieron al usarlos.

### Modelo de Gemini deprecado

La clave de API del usuario no tiene acceso a `gemini-2.5-flash` (el modelo por defecto del plan): la API respondía `404 NOT_FOUND` indicando que el modelo ya no está disponible para claves nuevas. Se probaron varios modelos en vivo y `gemini-3.5-flash` respondió correctamente. El cambio se aplicó únicamente como override en `backend/.env` (no versionado), sin tocar el valor por defecto en `app/core/config.py` ni en `.env.example`, para no imponer ese modelo a otros entornos/claves.

### Bug de concurrencia en `GeminiClient` (corregido)

Con el modelo correcto, las llamadas seguían fallando de forma intermitente con `HTTP_ERROR`. Aislar la llamada cruda al SDK con los mismos parámetros funcionaba siempre; llamar a `GeminiClient.generate()` fallaba a veces. Al destapar la excepción real (bypaseando el `except Exception` genérico) apareció: `RuntimeError: Cannot send a request, as the client has been closed`.

Causa: `self._build_client().models.generate_content(...)` encadenaba la llamada sobre un cliente `genai.Client` temporal sin guardar referencia. El SDK despacha la petición a un hilo de un pool (via `tenacity`/`concurrent.futures`), y sin una referencia viva el recolector de basura podía cerrar el `httpx` interno del cliente mientras la petición seguía en curso — una condición de carrera que explica la intermitencia.

Corrección en `backend/app/integrations/gemini/client.py`: se asigna el cliente a una variable local (`client = self._build_client()`) antes de invocar `.models.generate_content(...)`, manteniendo la referencia viva durante toda la llamada. Es un fix de una línea pero de un bug real de concurrencia, no de configuración.

Verificación: 4 llamadas consecutivas a `GeminiClient.generate()` exitosas (antes intermitente), suite completa `pytest tests -q` sin regresiones (109 passed), y — a petición explícita del usuario tras cuestionar si de verdad se había probado — una verificación end-to-end real vía HTTP contra la API en marcha: crear rúbrica → publicar → subir trabajo → `POST /api/evaluations` → `201` con evaluación generada por IA real (`status: AI_GENERATED`, feedback real, puntaje total calculado). Este es el nivel de prueba que debe hacerse antes de reportar un fix como confirmado: una llamada real de punta a punta por el camino que usa el usuario, no sólo pruebas aisladas de un componente o la suite automatizada.

### Rúbrica de ejemplo

Se creó y publicó una rúbrica "Trabajo de investigación" (id=3) con 4 criterios (pesos 25/30/30/15) y 4 niveles de desempeño cada uno (Insuficiente/Suficiente/Bueno/Excelente = 1/2/3/4). La rúbrica de prueba usada en la verificación end-to-end (id=2, "Prueba diagnóstico") no pudo borrarse por estar en uso (`RUBRIC_IN_USE`, comportamiento esperado) y se archivó en su lugar.

### Estado de git

Esta sesión, junto con la anterior (Iteraciones 1–9), se commitea en este punto. `backend/.env` y `backend/app.db` permanecen fuera de git (confirmado con `git check-ignore -v`); la clave real de Gemini nunca se versiona.
