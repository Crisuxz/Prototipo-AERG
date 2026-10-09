# RS-07 — Revisión de los términos de la API de Gemini (retención y entrenamiento)

**Fecha de consulta:** 2026-10-09
**Método:** lectura de las páginas oficiales de Google AI for Developers. Las citas son textuales (en inglés, como aparecen en la fuente) y están acotadas a los fragmentos relevantes.

## Fuentes

| # | Documento | URL | Última actualización indicada en la página |
|---|---|---|---|
| F1 | Gemini API Additional Terms of Service | https://ai.google.dev/gemini-api/terms | 2026-04-28 UTC (términos vigentes desde el 23 de marzo de 2026) |
| F2 | Data logging and sharing | https://ai.google.dev/gemini-api/docs/logs-policy | 2026-09-04 UTC |

## Citas relevantes

### Nivel gratuito ("Unpaid Services": Google AI Studio y la cuota gratuita de la API) — F1

- Google "uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products", incluidas "machine learning technologies".
- "human reviewers may read, annotate, and process your API input and output", tras "disconnecting this data from your Google Account, API key, and Cloud project before reviewers see or annotate it."
- **"Do not submit sensitive, confidential, or personal information to the Unpaid Services."**
- Para usuarios del EEE, Suiza y Reino Unido, las reglas de los servicios de pago "apply to all Services, including Google AI Studio and unpaid quota in the Gemini API". (No es el caso de México.)
- La página no fija un plazo de retención general para el nivel gratuito.

### Nivel de pago ("Paid Services": proyecto de Cloud con facturación activa) — F1

- Google "doesn't use your prompts" (incluidas instrucciones de sistema, contenido en caché y archivos) "or responses to improve our products"; el tratamiento se rige por los términos de encargado de tratamiento de datos de Google.
- "Google logs prompts and responses for a limited period of time", "solely for detecting and preventing violations of the Prohibited Use Policy" y para divulgaciones legales requeridas. No se indica un plazo exacto.
- "This data may be stored transiently or cached in any country in which Google or its agents maintain facilities."

### Registros (logging) opcionales del nivel de pago — F2

- El registro es voluntario: "As a project owner you have the choice to opt-in to logging of Gemini API calls".
- "Logs are retained for a default maximum period of 55 days." (Configurable a 7, 14, 28 o 55 días.)
- Por defecto, en proyectos con facturación, "prompts and responses within logs are not used for product improvement or development".
- Si se comparten como dataset con Google, pasan a tratarse con los términos del nivel gratuito, "including improving and training our models", y "do not contribute logs containing sensitive, confidential, or proprietary information obtained through the paid service".

### Grounding (no usado por el prototipo) — F1

- Con Grounding with Google Search/Maps, "Google will store prompts, contextual information that you may provide, and output for thirty (30) days". El prototipo no activa grounding (ver `GenerateContentConfig` en `client.py`).

## Comparativa

| Aspecto | Nivel gratuito | Nivel de pago |
|---|---|---|
| Uso para mejorar/entrenar modelos | **Sí** | **No** (salvo que se compartan datasets voluntariamente) |
| Revisión humana | Sí (desvinculada de la cuenta) | No para mejora de producto; solo registros acotados para abuso |
| Retención | No especificada | "Período limitado" para abuso; logs opcionales hasta 55 días |
| Datos personales | **Prohibido enviarlos** | Permitido bajo los términos de encargado de tratamiento |

## Evidencia del código: el texto del trabajo solo se envía a Gemini

Se revisaron todas las salidas de red del backend (`grep` de `httpx.`, `requests.`, `genai.Client`, `generate_content` en `backend/app`). Solo existen dos:

| Salida | Archivo y función | ¿Incluye el texto del trabajo? |
|---|---|---|
| Google Gemini | `app/integrations/gemini/client.py` → `GeminiClient.generate()` (`client.models.generate_content`) | **Sí**: el prompt lo arma `app/integrations/gemini/prompt_builder.py` (bloque 4 "STUDENT SUBMISSION", `context.submission_text`) |
| LMS (AGS) | `app/integrations/lms/lti13_adapter.py` → `LTI13Adapter.send_result()` (`httpx.post`) | **No**: `LMSAdapter.build_payload()` (`app/integrations/lms/adapter.py`) solo envía identificador del estudiante, puntajes, retroalimentación y fechas |

Recorrido del texto:

1. `POST /api/submissions` → `SubmissionService.create_from_upload()` extrae el texto y lo guarda en `submissions.extracted_text` (SQLite local).
2. `POST /api/evaluations` y `POST /api/evaluations/{id}/regenerate` → `EvaluationService._run_generation()` → `_prepare_text()` (recorta a `MAX_SUBMISSION_CHARS`) → `EvaluationContext.submission_text` → `GeminiService.evaluate()` → `GeminiClient.generate()`.
3. El texto no se escribe en logs ni en incidencias (verificado por la prueba `test_rs06_el_texto_del_trabajo_y_la_api_key_no_llegan_a_logs_ni_incidencias`, ver `../RS-06/`), y `EvaluationGeneration.prompt_context_summary` guarda solo ids, no el texto.

## Conclusión

Con el **nivel gratuito**, el texto de los trabajos puede usarse para mejorar y entrenar los modelos de Google y ser leído por revisores humanos, y los términos prohíben expresamente enviar información personal. Por lo tanto, **el nivel gratuito no es aceptable para trabajos reales de estudiantes**. Con el **nivel de pago**, Google no usa los prompts ni las respuestas para mejorar sus productos y solo los conserva por un periodo limitado para detectar abusos, lo que es compatible con RS-07 siempre que no se active el registro opcional ni se compartan datasets.

**Nivel de la clave en uso:** confirmado por los tesistas el 2026-10-09: el proyecto de Google Cloud asociado a la clave de `backend/.env` tiene la facturación activa, es decir, usa el **nivel de pago**. Este dato no puede verificarse desde el repositorio; lo comprueba el titular en la consola de Google Cloud.

## Recomendación

1. **Usar el nivel de pago** (proyecto con facturación activa) para cualquier prueba con trabajos reales, y dejar desactivado el *logging* opcional de AI Studio (o, si se activa, retención de 7 días y sin compartir datasets).
2. **Seudonimizar**: capturar como `student_identifier` un ID seudónimo (en LTI ya es el `sub` del LMS, sin nombre) y pedir a los alumnos que no incluyan nombre ni matrícula en el cuerpo del trabajo; el sistema envía a Gemini el texto completo del trabajo.
3. Con el nivel gratuito, usar **solo textos ficticios o de prueba** (como los de `scripts/evidencias/sembrar_datos.py`).
4. Registrar en la tesis (sección de consideraciones éticas) la fecha de esta consulta, ya que los términos cambian con frecuencia.
