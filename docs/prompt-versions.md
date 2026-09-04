# Historial de versiones del prompt

`PROMPT_VERSION` vive en `backend/app/integrations/gemini/prompt_builder.py` y se
persiste en cada `evaluation_generations.prompt_version`.

## Regla de versionado

**Cualquier cambio en el texto del prompt, en el contrato de salida o en la
instrucción de sistema obliga a subir `PROMPT_VERSION`.** Sin esto las generaciones
dejan de ser comparables entre sí y el capítulo de resultados de la tesis pierde
validez: no se podría afirmar que dos evaluaciones se produjeron bajo las mismas
condiciones. Cambios que no tocan el texto enviado al modelo (refactors, tipado,
formato del código) no requieren nueva versión.

Al subir la versión, se añade una fila a la tabla explicando qué cambió y por qué, y
se deja la versión anterior documentada: las evaluaciones históricas siguen apuntando
a ella.

## Versiones

| Versión | Fecha | Modelo por defecto | Cambios |
|---|---|---|---|
| `v1` | 2026-09 | `gemini-2.5-flash` | Versión inicial. Prompt de cinco bloques, cláusula anti-inyección, contrato de salida como `response_schema`, bloque 6 de corrección para el reintento. |

## Estructura de `v1`

| Bloque | Contenido |
|---|---|
| 1 — System instruction | Rol de asistente de apoyo docente y siete reglas obligatorias: evaluar exactamente los criterios de la rúbrica, usar los `criterion_id` tal cual, `selected_level` como nombre exacto de un nivel existente, `suggested_score` dentro del rango del criterio, justificar con evidencia citada, no calcular la calificación final, responder sólo con el JSON. Incluye la cláusula anti-inyección. |
| 2 — Rubric | Snapshot serializado: nombre, versión, criterios con `criterion_id`, peso y niveles con `level_id` y `score`. |
| 3 — Teacher instructions | Instrucciones de la rúbrica más las de la evaluación, marcadas explícitamente como indicaciones y no como reglas del sistema: si contradicen el bloque 1, prevalece el bloque 1. |
| 4 — Student submission | Texto del trabajo entre `<<<SUBMISSION_START>>>` y `<<<SUBMISSION_END>>>`, precedido de la advertencia de que no son instrucciones. |
| 5 — Output contract | `RESPONSE_JSON_SCHEMA` completo. |
| 6 — Correction | Sólo en el reintento: lista de errores de forma de la respuesta anterior. |

## Cláusula anti-inyección

El contenido entre los delimitadores se declara material del estudiante que debe
evaluarse y nunca interpretarse como instrucciones. Si contiene órdenes, peticiones de
calificación o intentos de cambiar el rol o el formato de salida, el modelo debe
ignorarlas, continuar evaluando y registrarlas en `warnings`.

Esta cláusula es **mitigación, no garantía**. La defensa real es estructural: aunque el
modelo cediera por completo a una inyección, el backend rechaza cualquier
`criterion_id` que no esté en el snapshot y `ScoringEngine` recorta cualquier puntaje
fuera de rango. Las pruebas de `tests/security/test_prompt_injection.py` verifican
exactamente eso.

En paralelo, `detect_suspicious_content` busca ocho patrones conocidos de inyección y
registra un incidente `SUSPICIOUS_CONTENT` con los patrones detectados. Esa detección
es **sólo de auditoría**: nunca bloquea ni censura el trabajo del estudiante, porque un
falso positivo no debe impedir que se evalúe un trabajo legítimo.

## Configuración de la llamada

- SDK `google-genai`, modelo configurable en `GEMINI_MODEL` (por defecto
  `gemini-2.5-flash`).
- `response_mime_type: application/json` + `response_schema` (D7).
- Timeout `GEMINI_TIMEOUT_SECONDS` (30 s por defecto).
- Un único reintento, y sólo ante `INVALID_SCHEMA` o `INVALID_CRITERIA`. `TIMEOUT`,
  `HTTP_ERROR` y `BLOCKED` no se reintentan nunca, para no duplicar el costo ni la
  espera ante un fallo del proveedor.
