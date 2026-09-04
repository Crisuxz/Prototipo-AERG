# Modelo de datos

Motor: SQLite (`app.db`) mediante SQLAlchemy 2.0. El esquema es portable a PostgreSQL
sin cambios de dominio: los enums se persisten como cadenas (`enum_column`) y los
campos estructurados como JSON.

## 1. Diagrama entidad-relación (textual)

```
users 1──* rubrics 1──* rubric_criteria 1──* performance_levels
  │                          
  │ 1──* submissions *──1 assignments *──1 lms_integrations
  │            │
  │            │ 1──* evaluations ──1 rubrics
  │                      ├──* evaluation_criterion_results
  │                      ├──* evaluation_generations
  │                      └──* evaluation_revisions *──1 users
  │
incident_logs (referencia lógica y polimórfica: related_entity_type + related_entity_id)
```

Las relaciones hijas de `rubrics` y de `evaluations` son `ON DELETE CASCADE`.
`incident_logs` **no** tiene clave foránea a propósito: debe poder registrar
incidencias de entidades que quizá no llegaron a persistirse.

## 2. Diccionario de datos

### `users`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `external_id` | str(128) único, nulo | Identificador del LMS (`sub` de LTI). Nulo para usuarios locales (D8). |
| `name` | str(255) | |
| `email` | str(255) único | |
| `role` | enum | `TEACHER`, `ADMIN` |
| `source` | enum | `LOCAL`, `LMS` |
| `created_at` | datetime | |

### `rubrics`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `name` | str(255) | |
| `description`, `instructions` | text, nulos | `instructions` se inyecta en el prompt. |
| `status` | enum | `DRAFT`, `PUBLISHED`, `ARCHIVED`. Sólo `PUBLISHED` es evaluable. |
| `version` | int | Se incrementa en cada edición. |
| `created_by` | FK `users.id` | |
| `created_at`, `updated_at` | datetime | |

### `rubric_criteria`
`id`, `rubric_id` (FK, cascade), `name`, `description`, `weight` (numeric 6,2),
`order`. La suma de `weight` debe ser 100 para poder publicar.

### `performance_levels`
`id`, `criterion_id` (FK, cascade), `name`, `description`, `score` (numeric 8,2),
`order`. Mínimo dos niveles por criterio. El mayor `score` define el máximo del
criterio.

### `assignments`
`id`, `external_id` (id en el LMS), `title`, `description`, `course_name`,
`lms_integration_id` (FK, nulo), `created_at`. Se crea al recibir un trabajo por el
simulador o por LTI; una subida manual no necesita `assignment`.

### `submissions`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `assignment_id` | FK, nulo | Presente si vino de un LMS. |
| `teacher_id` | FK `users.id` | |
| `student_identifier` | str(128) | Identificador, no nombre completo (minimización de datos). |
| `original_filename` | str(512) | Nombre tal como lo envió el docente; sólo se muestra. |
| `stored_filename` | str(255) | Nombre generado por el backend; nunca se deriva del original (anti path traversal). |
| `file_extension`, `mime_type`, `file_size_bytes` | | |
| `extracted_text` | text, nulo | Texto normalizado y truncado que se envía al modelo. |
| `extraction_status` | enum | `PENDING`, `SUCCESS`, `FAILED`, `EMPTY` |
| `extraction_error` | text, nulo | |
| `created_at` | datetime | |

### `evaluations`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `submission_id`, `rubric_id` | FK | |
| `rubric_version_snapshot` | JSON | **Copia inmutable** de la rúbrica al momento de evaluar (D5). Autoridad para validar y recalcular. |
| `teacher_instructions` | text, nulo | |
| `general_feedback` | text, nulo | |
| `status` | enum | `DRAFT`, `PROCESSING`, `AI_GENERATED`, `UNDER_REVIEW`, `APPROVED`, `FAILED`, `CANCELLED` |
| `current_generation_id` | FK `evaluation_generations.id`, nulo | Generación vigente. |
| `final_total_score`, `final_max_score` | numeric 8,2, nulos | Calculados por `ScoringEngine`, nunca por la IA. |
| `approved_by` | FK `users.id`, nulo | |
| `approved_at`, `sent_to_lms_at` | datetime, nulos | |
| `lms_result_payload` | JSON, nulo | Lo que se envió al LMS (evidencia de RI-02). |
| `created_at`, `updated_at` | datetime | |

### `evaluation_criterion_results`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `evaluation_id` | FK, cascade | |
| `criterion_id` | int | Id **del snapshot**, no FK: la rúbrica puede cambiar después. |
| `criterion_name`, `weight` | | Copiados del snapshot. |
| `selected_level_id` | int, nulo | |
| `ai_suggested_score` | numeric, nulo | Sugerencia original de la IA. Se conserva sólo como evidencia. |
| `final_score` | numeric | Valor efectivo tras validación y revisión docente. |
| `weighted_score` | numeric | `(final_score / max_level_score) * weight`. |
| `ai_feedback`, `final_feedback` | text | Permiten comparar IA vs. docente. |
| `evidence` | JSON (lista) | Citas del trabajo. |
| `improvement_suggestion` | text | |
| `modified_by_teacher` | bool | Métrica directa para el capítulo de resultados. |

Restricción única: `(evaluation_id, criterion_id)`.

### `evaluation_generations`
`id`, `evaluation_id` (FK, cascade), `generation_number`, `prompt_version`,
`model_name`, `prompt_context_summary` (JSON), `raw_response` (JSON, nulo),
`validation_status` (enum), `validation_errors` (JSON, nulo), `latency_ms`,
`created_at`. **Nunca se borra ni se sobrescribe**: regenerar añade la generación
N+1, de modo que la trazabilidad de todos los intentos queda intacta.

### `evaluation_revisions`
`id`, `evaluation_id` (FK, cascade), `criterion_result_id` (FK, nulo),
`field_changed` (`SCORE`, `FEEDBACK`, `GENERAL_FEEDBACK`, `LEVEL`), `previous_value`,
`new_value`, `changed_by` (FK `users.id`), `changed_at`. Es la evidencia cuantificable
de la intervención humana.

### `incident_logs`
`id`, `related_entity_type` (`SUBMISSION`, `EVALUATION`, `GENERATION`,
`LMS_INTEGRATION`), `related_entity_id`, `incident_type`, `severity` (`INFO`,
`WARNING`, `ERROR`, `CRITICAL`), `message`, `details` (JSON), `created_at`.

Tipos de incidencia: `EXTRACTION_FAILED`, `EMPTY_DOCUMENT`, `SUBMISSION_TRUNCATED`,
`SUSPICIOUS_CONTENT`, `GEMINI_TIMEOUT`, `GEMINI_HTTP_ERROR`, `GEMINI_BLOCKED`,
`INVALID_AI_RESPONSE`, `AI_SCORE_CLAMPED`, `EVALUATION_FAILED`, `LMS_SEND_FAILED`.
`details` se redacta antes de persistirse: cualquier secreto aparece como
`[REDACTED]`.

### `lms_integrations`
`id`, `name`, `type` (`SIMULATOR`, `LTI1_3`), `config` (JSON), `is_active`,
`created_at`.

## 3. Migraciones y datos semilla

| Revisión | Contenido |
|---|---|
| `b1e466eb9fff` | Esquema inicial completo del dominio |
| `5c137c3ca63b` | Docente de prueba (`docente@prototipo.local`, id 1) e integración `SIMULATOR` activa |

`alembic upgrade head` deja la base lista para usar.

## 4. Reglas de integridad que el código garantiza

1. Una evaluación sólo puede crearse sobre una rúbrica `PUBLISHED`.
2. El conjunto de `criterion_id` de los resultados coincide exactamente con el del
   snapshot; ni sobra ni falta ninguno.
3. `0 ≤ final_score ≤ max_level_score` del criterio, siempre.
4. `final_total_score = Σ weighted_score`, recalculado tras cada cambio.
5. Una evaluación `APPROVED` es inmutable: `review`, `regenerate` y `approve`
   devuelven 409.
6. Una rúbrica referenciada por alguna evaluación no puede borrarse.
