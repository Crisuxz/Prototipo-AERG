# Decisiones técnicas adoptadas

Registro de las decisiones marcadas como **DECISIÓN TÉCNICA ADOPTADA** en
`PLAN_MAESTRO.md`, con el estado real de su implementación en el prototipo.

| # | Decisión | Justificación | Dónde vive |
|---|---|---|---|
| D1 | Cliente HTTP del frontend: **Axios** | Interceptores centralizados para adjuntar el token, normalizar errores estructurados y manejar timeouts de forma uniforme en todas las pantallas. | `frontend/src/services/apiClient.ts` |
| D2 | Acceso a datos: **SQLAlchemy 2.0 + Pydantic v2 separados** (no SQLModel) | Frontera explícita entre persistencia y contratos de API: permite construir *snapshots* inmutables de rúbrica y no expone campos internos. | `backend/app/models/` vs `backend/app/schemas/` |
| D3 | Migraciones: **Alembic** | Permite evolucionar el esquema y migrar de SQLite a PostgreSQL sin rediseñar el dominio (RNF-04/RNF-09). | `backend/app/db/migrations/` |
| D4 | Ejecución **síncrona** de la evaluación (sin colas ni workers) | El prototipo evalúa un trabajo a la vez; una petición HTTP que espera la respuesta de Gemini es suficiente y elimina toda la complejidad de un sistema de tareas. | `EvaluationService.create` |
| D5 | Versionado de rúbrica por **snapshot JSON inmutable** por evaluación + `version` incremental en la rúbrica | Una evaluación pasada debe seguir siendo reproducible y auditable aunque el docente edite después la rúbrica. El snapshot es también la fuente de verdad contra la que se validan los `criterion_id` que devuelve la IA. | `Evaluation.rubric_version_snapshot` |
| D6 | Extracción de texto: **pypdf** (PDF), **python-docx** (DOCX), lectura directa (TXT) | Bibliotecas puras de Python, sin binarios externos que compliquen el despliegue. | `backend/app/services/extraction/` |
| D7 | Salida de Gemini: **structured output** (`response_mime_type: application/json` + `response_schema`) con el SDK `google-genai` | Reduce drásticamente la probabilidad de JSON malformado; la validación Pydantic en el backend sigue siendo obligatoria como segunda barrera. | `backend/app/integrations/gemini/` |
| D8 | Autenticación: **docente único de prueba** con token simple de sesión local, y `User` desacoplado del mecanismo de autenticación (`external_id` + `source`) | Cumple RS-01 sin construir un sistema de autenticación propio innecesario, y deja que LTI 1.3 (OIDC) lo sustituya sin rediseñar el dominio. | `backend/app/core/security.py`, `app/models/user.py` |
| D9 | LMS/LTI: interfaz **`LMSAdapter`** con dos implementaciones, `SimulatorAdapter` (Nivel 1) y `LTI13Adapter` (Nivel 2) | Permite demostrar el flujo completo sin depender de un LMS real y deja trazado el camino hacia LTI real. | `backend/app/integrations/lms/` |
| D10 | Pruebas: **pytest + TestClient** (backend), **Vitest + React Testing Library** (frontend) | Estándar de facto para FastAPI/React, con integración simple en CI. | `backend/tests/` |
| D11 | Configuración: **pydantic-settings** leyendo `.env` | Evita hardcodear secretos (RS-03) y centraliza la configuración. | `backend/app/core/config.py` |

## Notas de implementación

**D5 — Estrategia de snapshot.** Al crear una evaluación se serializa la rúbrica
completa (nombre, descripción, instrucciones, `version`, criterios y niveles con sus
identificadores y puntajes) dentro de `evaluations.rubric_version_snapshot`. Ese JSON
no se vuelve a tocar nunca. Editar la rúbrica original incrementa `rubrics.version` y
no altera ninguna evaluación previa, algo que verifica la prueba
`test_editar_rubrica_no_altera_evaluaciones_pasadas`. Todas las validaciones de la
respuesta de la IA y todo el recálculo de puntajes se hacen contra el snapshot, nunca
contra la rúbrica viva.

**D9 — Desviación respecto al plan.** El plan proponía `pylti1p3` para el adaptador
LTI 1.3. La implementación usa `PyJWT` + `cryptography` directamente porque el
prototipo sólo necesita dos operaciones del estándar (construir el redirect de login
OIDC y validar la firma, el `aud`/`iss`, el `deployment_id` y la expiración del
`id_token`), y hacerlo con PyJWT evita arrastrar la máquina de estado y el
almacenamiento de sesión completos de `pylti1p3`. El contrato público
(`LMSAdapter`) no cambia, de modo que sustituir la implementación más adelante no
afecta al resto del sistema.

**D8 — Alcance de la autenticación.** El token es un secreto compartido de un solo
docente configurado en `AUTH_TOKEN`. No hay registro de usuarios, ni sesiones, ni
refresco de credenciales: es deliberadamente el mínimo que cumple RS-01 en un
prototipo de tesis y **no** debe usarse en producción con datos reales de estudiantes.
