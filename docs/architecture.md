# Arquitectura

## 1. Visión general

Cliente-servidor de tres capas lógicas, con dos integraciones externas. **Toda la
lógica de IA vive exclusivamente en el backend**: el frontend nunca conoce la API key
ni el prompt, y nunca habla con Gemini.

```
        ┌──────────────┐
        │   Docente    │
        └──────┬───────┘
               │ HTTPS
        ┌──────▼────────────────┐
        │  Frontend SPA         │  React 19 + Vite + Tailwind
        │  (6 pantallas)        │
        └──────┬────────────────┘
               │ REST/JSON  (Authorization: Bearer)
        ┌──────▼────────────────┐        ┌──────────────────┐
        │  API REST FastAPI     │───────▶│  Google Gemini   │
        │  routes → services    │◀───────│  (structured     │
        │  → repositories       │        │   output JSON)   │
        └──────┬────────────────┘        └──────────────────┘
               │ SQLAlchemy                       ▲
        ┌──────▼────────────────┐        ┌────────┴─────────┐
        │  SQLite (app.db)      │        │  LMSAdapter      │
        │  + uploads/           │◀──────▶│  Simulator/LTI13 │
        └───────────────────────┘        └──────────────────┘
```

## 2. Principio rector: Human-in-the-Loop

> La IA propone, el backend valida, el docente revisa y aprueba.

Consecuencias de diseño que atraviesan todo el código:

1. **Ningún número que provenga del modelo se persiste como calificación.** El puntaje
   sugerido se guarda sólo como `ai_suggested_score` (evidencia para la tesis). El
   valor efectivo lo produce `ScoringEngine` de forma determinista.
2. **El snapshot de rúbrica es la única autoridad** sobre qué criterios existen, qué
   niveles tiene cada uno y cuál es su puntaje máximo.
3. **Ninguna evaluación sale del sistema sin aprobación explícita** del docente; el
   envío al LMS ocurre únicamente en `approve`.
4. **Todo lo que sale mal se registra** en `incident_logs` en lugar de perderse en un
   log de texto.

## 3. Capas del backend

| Capa | Directorio | Responsabilidad |
|---|---|---|
| Rutas | `app/api/routes/` | Traducir HTTP ↔ dominio. Sin lógica de negocio. |
| Dependencias | `app/api/deps.py` | Sesión de BD, settings, usuario autenticado, `get_gemini_service`. |
| Servicios | `app/services/` | Reglas de negocio y orquestación (el corazón del sistema). |
| Repositorios | `app/repositories/` | Consultas SQLAlchemy reutilizables. |
| Modelos | `app/models/` | Tablas y relaciones. |
| Schemas | `app/schemas/` | Contratos de entrada/salida y contrato de la IA. |
| Integraciones | `app/integrations/` | Gemini y adaptadores LMS. |
| Núcleo | `app/core/` | Configuración, errores, logging, seguridad. |

Los servicios reciben la sesión por constructor, de modo que las pruebas los ejercitan
directamente sin levantar HTTP cuando conviene.

## 4. Componentes clave

### `RubricService`
Crea, edita, publica y archiva rúbricas. Reglas: sólo se publica si los pesos suman
100 y cada criterio tiene al menos dos niveles; una rúbrica publicada usada por alguna
evaluación no se puede borrar (`RUBRIC_IN_USE`); cada edición incrementa `version`.

### `DocumentProcessingService`
Valida extensión, tamaño y contenido del archivo; extrae texto con pypdf/python-docx o
lectura directa; normaliza espacios en blanco; trunca a `MAX_SUBMISSION_CHARS`
dejando constancia. Cada fallo produce un `IncidentLog` (`EXTRACTION_FAILED`,
`EMPTY_DOCUMENT`, `SUBMISSION_TRUNCATED`).

### `GeminiService` (prompt → llamada → parseo)
- `prompt_builder` arma el prompt de cinco bloques (system instruction, rúbrica,
  instrucciones del docente, trabajo del estudiante entre delimitadores, contrato de
  salida) más un sexto bloque de corrección en el reintento.
- `client` llama al SDK `google-genai` con `response_mime_type` y `response_schema`.
- `response_parser` clasifica el resultado en un `GenerationValidationStatus`.

### `EvaluationService`
Orquesta el ciclo completo:

```
create(submission, rubric, instrucciones)
  ├─ verifica que la rúbrica esté PUBLISHED         → INVALID_RUBRIC (409) si no
  ├─ congela el snapshot de rúbrica
  ├─ detecta patrones sospechosos (auditoría, no censura)
  ├─ llama a Gemini                                  → EvaluationGeneration #1
  ├─ valida (esquema → criterios → niveles → rango → feedback)
  ├─ reintenta UNA vez sólo si INVALID_SCHEMA / INVALID_CRITERIA
  ├─ ScoringEngine recalcula todos los puntajes
  └─ estado AI_GENERATED  (o FAILED + incidente)

review(...)   registra EvaluationRevision por cada cambio y recalcula
regenerate()  crea la generación N+1 sin borrar las anteriores
approve()     congela, marca APPROVED y envía al LMSAdapter activo
```

### `ScoringEngine`
Única fuente de puntajes:

```
weighted_score = (final_score / max_level_score) * weight
final_total_score = Σ weighted_score
```

`final_score` se recorta al rango `[0, max_level_score]` del criterio como última
línea de defensa; si hubo recorte se registra `AI_SCORE_CLAMPED`.

### `LMSAdapter`
Interfaz con `build_payload` y `send_result`. `SimulatorAdapter` guarda el payload en
`evaluations.lms_result_payload` con `transport: "SIMULATOR"`; `LTI13Adapter` implementa
el launch OIDC y la validación del `id_token`.

## 5. Flujo principal (evaluar un trabajo)

1. `POST /api/submissions` — el docente sube el archivo; el backend extrae el texto.
2. `POST /api/evaluations` — con `submission_id`, `rubric_id` e instrucciones
   opcionales; la respuesta ya trae la propuesta de la IA con puntajes recalculados.
3. `PUT /api/evaluations/{id}/review` — el docente ajusta puntajes y retroalimentación;
   cada cambio queda como `EvaluationRevision`.
4. `POST /api/evaluations/{id}/regenerate` — opcional; añade una generación nueva.
5. `POST /api/evaluations/{id}/approve` — congela la evaluación y la envía al LMS. A
   partir de aquí `review`, `regenerate` y `approve` responden 409.

## 6. Frontend

SPA con react-router. `apiClient` (Axios) adjunta el token en un interceptor de
petición y normaliza toda respuesta de error al tipo `ApiError` (`{code, message}`) en
un interceptor de respuesta. Los hooks (`useAsyncData` y derivados) exponen el mismo
estado de petición en todas las pantallas: `idle | loading | success | error | empty`,
de modo que cada vista tiene siempre un estado vacío y un estado de error explícitos.

| Pantalla | Ruta | Función |
|---|---|---|
| Dashboard | `/` | Métricas y últimas evaluaciones |
| Rúbricas | `/rubricas` | Listado, búsqueda, filtros, borrado |
| Detalle de rúbrica | `/rubricas/:id` (`nueva` para crear) | Editor con suma de pesos en vivo |
| Evaluar trabajo | `/evaluar` | Subida → rúbrica → instrucciones → generar |
| Revisión | `/evaluaciones/:id/revision` | Ajuste por criterio, regenerar, aprobar, trazabilidad |
| Historial | `/historial` | Filtros por estado y rúbrica, paginación |

## 7. Manejo de errores

Todos los errores viajan con la misma forma:

```json
{ "error": { "code": "INVALID_RUBRIC", "message": "..." } }
```

`DomainError` lleva el código estable; los handlers de `app/core/errors.py` cubren
también `HTTPException`, errores de validación y excepciones no controladas. Un error
inesperado devuelve siempre `INTERNAL_ERROR` con un mensaje genérico: la traza se
escribe en el log del servidor y nunca se expone al cliente.
