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
