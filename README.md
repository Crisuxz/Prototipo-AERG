# AERG

## Asistente de Evaluación Automatizada con Retroalimentación Generativa

Prototipo de tesis para asistir al docente en la evaluación de trabajos académicos mediante rúbricas y retroalimentación generativa. La aplicación combina una interfaz web, una API REST, persistencia local y una integración opcional con Google Gemini.

> **Estado:** prototipo funcional para desarrollo, validación académica y demostraciones. No debe utilizarse con datos reales de estudiantes sin revisar y sustituir el mecanismo de autenticación y las medidas de protección de datos.

## Características

- Creación, edición, publicación y archivo de rúbricas.
- Carga y extracción de texto desde archivos `.pdf`, `.docx` y `.txt`.
- Evaluación generativa con Google Gemini mediante respuestas estructuradas.
- Recalculo determinista de puntajes en el backend.
- Revisión y aprobación explícita por parte del docente.
- Historial de generaciones, revisiones e incidencias para trazabilidad.
- Adaptador LMS simulador y soporte preparado para LTI 1.3.
- Interfaz responsive con estados de carga, vacío y error.
- Documentación OpenAPI disponible desde la API.

## Principio de funcionamiento

La IA propone; el backend valida; el docente revisa y aprueba.

El puntaje sugerido por Gemini se conserva como evidencia (`ai_suggested_score`), pero nunca se persiste como calificación efectiva. El `ScoringEngine` calcula los resultados a partir del snapshot inmutable de la rúbrica. Una evaluación sólo se envía al LMS después de la aprobación explícita del docente.

## Arquitectura

```text
Docente
   │ HTTPS
Frontend React + Vite + Tailwind
   │ REST/JSON + Bearer token
Backend FastAPI
   ├── Servicios y repositorios SQLAlchemy
   ├── Google Gemini (opcional)
   ├── Adaptador LMS simulador o LTI 1.3
   └── SQLite (app.db) + uploads/
```

### Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Axios |
| Backend | Python 3.14, FastAPI, Uvicorn, Pydantic Settings |
| Persistencia | SQLAlchemy 2, SQLite, Alembic |
| IA | Google GenAI SDK, Gemini |
| Documentos | `pypdf`, `python-docx` |
| Calidad | Pytest, Oxlint, TypeScript |

## Requisitos

- Python 3.14 o compatible con las versiones de `backend/requirements.txt`.
- Node.js 22 o superior y npm.
- Git.
- Docker y Docker Compose sólo son necesarios si se desea añadir una infraestructura externa; el desarrollo local no los requiere.
- Una clave de Google Gemini únicamente para ejecutar evaluaciones reales con IA.

## Instalación Local

### 1. Obtener el código

```bash
git clone <URL_DEL_REPOSITORIO>
cd Prototipo-AERG
```

### 2. Preparar el backend

En Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

En Linux o macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

### 3. Preparar el frontend

Desde la raíz del repositorio:

```bash
cd frontend
npm ci
cp .env.example .env       # Windows: Copy-Item .env.example .env
```

El archivo `frontend/.env` debe conservar `VITE_API_BASE_URL=/api` y usar el mismo token definido en `backend/.env`.

### 4. Inicializar la base de datos (obligatorio)

Antes de iniciar el backend, ejecuta la migración para crear el esquema y los datos semilla:

```bash
cd backend
# Windows: .\.venv\Scripts\Activate.ps1
alembic upgrade head     # obligatorio antes del primer arranque
```

Este comando crea `backend/app.db`, aplica el esquema y carga los datos semilla: un docente de prueba y una integración LMS `SIMULATOR` activa.

## Ejecución En Desarrollo

Abrir dos terminales.

Terminal 1, backend:

```bash
cd backend
# Windows: .\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

URLs principales:

- Aplicación: `http://localhost:5173`
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- Health check: `http://localhost:8000/api/health`

Comprobación rápida:

```bash
curl http://localhost:8000/api/health
```

Respuesta esperada:

```json
{"status":"ok"}
```

## Configuración

La plantilla completa está en `backend/.env.example` y `frontend/.env.example`.

| Variable | Ejemplo | Descripción |
|---|---|---|
| `ENV` | `dev` | Entorno de ejecución. |
| `DATABASE_URL` | `sqlite:///./app.db` | URL de SQLAlchemy. |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes permitidos, separados por comas. |
| `AUTH_TOKEN` | `prototipo-dev-token` | Token compartido del prototipo. |
| `GEMINI_API_KEY` | vacío en local | Clave para usar Gemini. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modelo generativo utilizado. |
| `GEMINI_TIMEOUT_SECONDS` | `30` | Tiempo máximo de espera de Gemini. |
| `MAX_UPLOAD_MB` | `10` | Tamaño máximo de archivo. |
| `MAX_SUBMISSION_CHARS` | `200000` | Máximo de caracteres enviados al modelo. |
| `UPLOAD_DIR` | `uploads` | Directorio de archivos cargados. |

Todos los endpoints protegidos requieren:

```http
Authorization: Bearer <AUTH_TOKEN>
```

`GET /api/health` es público. La autenticación actual es deliberadamente simple y está pensada para el prototipo, no para producción multiusuario.

## Flujo Principal

1. Crear y publicar una rúbrica en `/rubricas`.
2. Cargar un trabajo desde `/evaluar`.
3. Generar la evaluación con Gemini.
4. Revisar puntajes y retroalimentación.
5. Regenerar opcionalmente la propuesta.
6. Aprobar la evaluación para congelarla y enviarla al adaptador LMS activo.

Endpoints principales:

| Método | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio. |
| `GET/POST` | `/api/rubrics` | Listar y crear rúbricas. |
| `POST` | `/api/rubrics/{id}/publish` | Publicar una rúbrica válida. |
| `POST` | `/api/submissions` | Cargar un trabajo. |
| `POST` | `/api/evaluations` | Crear una evaluación. |
| `PUT` | `/api/evaluations/{id}/review` | Registrar revisión docente. |
| `POST` | `/api/evaluations/{id}/regenerate` | Crear una nueva generación. |
| `POST` | `/api/evaluations/{id}/approve` | Aprobar y enviar al LMS. |

La referencia completa está en [`docs/api.md`](docs/api.md).

## Pruebas Y Calidad

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

El build genera los archivos estáticos en `frontend/dist`.

## Migraciones

```bash
cd backend
alembic upgrade head       # aplicar migraciones pendientes
alembic current            # revisar la revisión actual
alembic history            # consultar el historial
```

Las migraciones se encuentran en `backend/app/db/migrations/versions/`. No se recomienda editar una migración ya aplicada; para cambios de esquema debe crearse una nueva revisión.

## Estructura Del Repositorio

```text
backend/
  app/
    api/             Rutas y dependencias HTTP
    core/            Configuración, seguridad, errores y logging
    integrations/    Gemini y adaptadores LMS
    models/          Modelos SQLAlchemy
    repositories/    Acceso a datos
    schemas/         Contratos de entrada y salida
    services/        Lógica de negocio
  tests/             Pruebas unitarias, integración, funcionales y seguridad
  requirements.txt
frontend/
  src/
    components/      Componentes reutilizables
    hooks/            Estado y llamadas asíncronas
    layouts/          Estructuras de página
    pages/            Vistas de la aplicación
    services/         Cliente HTTP y APIs
docs/                Arquitectura, API, modelo de datos y operación
deployment/          Systemd, Caddy, nginx y plantilla de producción
```

## Despliegue

La topología prevista es un único nodo: Uvicorn en `127.0.0.1:8000`, frontend compilado como estáticos, SQLite y un proxy inverso con TLS.

El procedimiento detallado está en [`docs/deployment.md`](docs/deployment.md). Los artefactos disponibles son:

- `deployment/aerg.service`: servicio systemd.
- `deployment/Caddyfile`: proxy inverso con TLS automático.
- `deployment/nginx.conf`: alternativa con nginx.
- `deployment/.env.production.example`: plantilla de producción.

En producción, `DATABASE_URL`, `UPLOAD_DIR` y el frontend deben apuntar a ubicaciones persistentes fuera del árbol público. También debe utilizarse un `AUTH_TOKEN` largo y aleatorio, HTTPS obligatorio y un mecanismo de autenticación adecuado para usuarios reales.

## Documentación Adicional

- [`docs/architecture.md`](docs/architecture.md): arquitectura y decisiones de diseño.
- [`docs/api.md`](docs/api.md): endpoints, autenticación y contratos.
- [`docs/data-model.md`](docs/data-model.md): entidades, relaciones y reglas de integridad.
- [`docs/deployment.md`](docs/deployment.md): instalación y operación en producción.
- [`docs/user-manual.md`](docs/user-manual.md): manual de usuario.
- [`docs/test-plan.md`](docs/test-plan.md): plan de pruebas.
- [`docs/decisions.md`](docs/decisions.md): decisiones técnicas.

## Seguridad Y Limitaciones

- La API utiliza un token compartido de prototipo, no cuentas individuales ni roles completos.
- La aplicación no cifra la base de datos ni los archivos en reposo.
- Las cargas se almacenan localmente en `uploads/` y deben protegerse mediante permisos del sistema.
- La API key de Gemini sólo debe existir en el backend y nunca en el frontend.
- El adaptador `SIMULATOR` es para pruebas; LTI 1.3 requiere completar su configuración.
- No se incluyen colas ni procesamiento asíncrono: la evaluación se ejecuta de forma síncrona.

## Licencia

No se ha definido una licencia de distribución para este repositorio. Consulta al responsable del proyecto antes de reutilizar o publicar el código.
