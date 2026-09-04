# API REST

Base: `/api`. Todas las respuestas son JSON UTF-8. La especificación viva y navegable
está en `/docs` (Swagger UI) y `/openapi.json`.

## Autenticación

Todos los endpoints excepto `GET /api/health` y el par LTI requieren:

```
Authorization: Bearer <AUTH_TOKEN>
```

Un token ausente, con esquema distinto de `Bearer` o con valor incorrecto devuelve
`401 UNAUTHORIZED`. Es la autenticación de prototipo descrita en D8.

## Formato de error

Toda respuesta de error tiene exactamente esta forma:

```json
{ "error": { "code": "INVALID_RUBRIC", "message": "Texto para el docente." } }
```

| Código | HTTP | Cuándo |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token ausente o inválido |
| `FORBIDDEN` | 403 | Recurso de otro docente |
| `NOT_FOUND` | 404 | Entidad inexistente |
| `CONFLICT` | 409 | Operación inválida para el estado actual (p. ej. modificar una evaluación aprobada) |
| `INVALID_RUBRIC` | 409 | Rúbrica no publicada, pesos que no suman 100, criterio con menos de dos niveles |
| `RUBRIC_IN_USE` | 409 | Intento de borrar una rúbrica ya usada en evaluaciones |
| `LTI_NOT_CONFIGURED` | 409 | Falta configuración LTI 1.3 |
| `INVALID_FILE_TYPE` | 400 | Extensión no permitida o contenido que no corresponde a la extensión |
| `FILE_TOO_LARGE` | 413 | Supera `MAX_UPLOAD_MB` |
| `EMPTY_DOCUMENT` | 422 | El documento no contiene texto extraíble |
| `EXTRACTION_FAILED` | 422 | Archivo corrupto o ilegible |
| `VALIDATION_ERROR` | 422 | Datos de entrada inválidos |
| `INVALID_AI_RESPONSE` | 502 | La IA no produjo una respuesta válida ni tras el reintento |
| `GEMINI_UNAVAILABLE` | 502 | Error HTTP del proveedor o respuesta bloqueada |
| `GEMINI_TIMEOUT` | 504 | Se agotó `GEMINI_TIMEOUT_SECONDS` |
| `INTERNAL_ERROR` | 500 | Error no controlado. Nunca incluye traza |

## Salud

### `GET /api/health`
Público. `200 {"status": "ok"}`.

## Rúbricas — `/api/rubrics`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/rubrics?status=&search=` | Listado resumido con `criteria_count` y `total_weight` |
| POST | `/api/rubrics` | Crea en estado `DRAFT`. `201` |
| GET | `/api/rubrics/{id}` | Detalle con criterios y niveles |
| PUT | `/api/rubrics/{id}` | Reemplaza criterios y niveles; incrementa `version` |
| DELETE | `/api/rubrics/{id}` | `204`. `RUBRIC_IN_USE` si ya se usó |
| POST | `/api/rubrics/{id}/publish` | Valida pesos = 100 y ≥ 2 niveles por criterio |
| POST | `/api/rubrics/{id}/archive` | Deja de ser evaluable, no se borra |

Cuerpo de creación/edición:

```json
{
  "name": "Ensayo argumentativo",
  "description": null,
  "instructions": "Prioriza la calidad de la argumentación.",
  "criteria": [
    {
      "name": "Argumentación", "description": null, "weight": 50, "order": 0,
      "levels": [
        { "name": "Insuficiente", "description": null, "score": 1, "order": 0 },
        { "name": "Excelente",    "description": null, "score": 4, "order": 3 }
      ]
    }
  ]
}
```

## Trabajos — `/api/submissions`

### `POST /api/submissions` — `multipart/form-data`
| Campo | Tipo | Notas |
|---|---|---|
| `file` | archivo | `.pdf`, `.docx`, `.txt`. Máx. `MAX_UPLOAD_MB` |
| `student_identifier` | texto | Opcional |
| `assignment_id` | entero | Opcional |

Responde `201` con la submission y su `extracted_text` ya normalizado. El backend
valida el tipo real del archivo, no sólo la extensión, y genera él mismo el nombre de
almacenamiento.

### `GET /api/submissions` · `GET /api/submissions/{id}`
Listado y detalle.

## Evaluaciones — `/api/evaluations`

### `POST /api/evaluations`
```json
{ "submission_id": 1, "rubric_id": 1, "teacher_instructions": null }
```
Ejecuta el ciclo completo de forma síncrona y devuelve `201` con la evaluación ya
puntuada. Errores posibles: `INVALID_RUBRIC` (rúbrica no publicada, verificado
**antes** de llamar a Gemini), `INVALID_AI_RESPONSE`, `GEMINI_TIMEOUT`,
`GEMINI_UNAVAILABLE`.

### `GET /api/evaluations?status=&rubric_id=&from=&to=`
Listado resumido para el historial. `from`/`to` son fechas ISO-8601.

### `GET /api/evaluations/{id}`
Detalle completo: resultados por criterio, `rubric_version_snapshot`, `submission`,
todas las `generations`, todas las `revisions` y `lms_result_payload`.

### `POST /api/evaluations/{id}/regenerate`
```json
{ "teacher_instructions": "Sé más estricto con las citas." }
```
Crea la generación N+1 sin borrar las anteriores y actualiza
`current_generation_id`.

### `PUT /api/evaluations/{id}/review`
```json
{
  "criteria": [ { "criterion_id": 1, "final_score": 3, "final_feedback": "..." } ],
  "general_feedback": "..."
}
```
Registra una `EvaluationRevision` por cada campo modificado y recalcula los totales.
Un puntaje fuera del rango del criterio o un `criterion_id` ajeno al snapshot
devuelven `422`.

### `POST /api/evaluations/{id}/approve`
Sin cuerpo. Congela la evaluación (`APPROVED`, `approved_by`, `approved_at`) y la envía
al adaptador LMS activo, guardando el resultado en `lms_result_payload`. Después de
aprobar, `review`, `regenerate` y `approve` devuelven `409`; aprobar una evaluación
`FAILED` también devuelve `409`.

## Incidencias — `GET /api/incidents`

Filtros: `incident_type`, `severity`, `entity_type`, `entity_id`. Los `details` se
devuelven ya redactados: ningún secreto de configuración aparece en la respuesta.

## LMS e interoperabilidad

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/lms/integrations` | Integraciones registradas y su estado |
| POST | `/api/lms/simulator/submissions` | Nivel 1: crea `Assignment` + `Submission` como si vinieran de un LMS |
| POST | `/api/lti/launch` | Nivel 2: inicio de login OIDC; responde `302` al `auth_login_url` |
| POST | `/api/lti/callback` | Nivel 2: recibe y valida el `id_token` |

Cuerpo del simulador:

```json
{
  "assignment_title": "Ensayo final",
  "course_name": "Metodología",
  "external_assignment_id": "a-42",
  "student_identifier": "A01234",
  "content": "Texto del trabajo..."
}
```

El redirect de `/api/lti/launch` incluye `client_id`, `response_type=id_token`,
`scope=openid`, `response_mode=form_post`, `prompt=none`, `nonce`, `state` y
`login_hint`. Si falta la configuración LTI responde `409 LTI_NOT_CONFIGURED`. En el
callback se verifican firma (contra el JWKS del emisor), `iss`, `aud`, `deployment_id`
y expiración; cualquier fallo devuelve `401`.

## Contrato de salida de la IA

No es parte de la API pública, pero define lo que el backend acepta del modelo:

```json
{
  "evaluation": {
    "criteria": [
      {
        "criterion_id": "1", "criterion_name": "Argumentación",
        "selected_level": "Excelente", "suggested_score": 4,
        "evidence": ["..."], "feedback": "...", "improvement_suggestion": "..."
      }
    ],
    "general_feedback": "...",
    "strengths": [], "areas_for_improvement": [], "warnings": []
  }
}
```

`suggested_score` **nunca** se usa como calificación: se guarda como
`ai_suggested_score` y `ScoringEngine` calcula el valor efectivo.
