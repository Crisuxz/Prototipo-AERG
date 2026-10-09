# Lista de verificación I6 — LTI 1.3 con Moodle local (RI-01, RI-06, RI-08, RF-20)

**Fecha:** 2026-10-09 · **Moodle:** 4.5.15 (Build: 20261005) con moodlehq/moodle-docker (PHP-Apache + PostgreSQL), http://localhost:8081 · **Playwright:** 1.64.0 (Chromium) · **Script:** `frontend/e2e/flujo_lti_moodle.mjs` · **Preparación de Moodle:** `scripts/evidencias/moodle_preparar_lti.php`

## Configuración

| Elemento | Valor |
|---|---|
| Herramienta externa | "Asistente AERG", LTI 1.3, llaves por *keyset URL*, servicio AGS "uso para sincronización de calificaciones y gestión de columnas", envío de nombre y correo |
| Inicio de sesión (OIDC) | `http://host.docker.internal:8000/api/lti/launch` |
| URI de redirección | `http://host.docker.internal:8000/api/lti/callback` |
| Conjunto de llaves (JWKS) | `http://host.docker.internal:8000/api/lti/jwks` |
| Curso | "Redaccion academica (prueba LTI AERG)" (id 2) |
| Participantes | `docente1` (Profesor con permiso de edición) y `alumno1` (Estudiante, id LTI `4`) |
| Actividad | "Ensayo argumentativo (evaluado con AERG)", calificación máxima 100 |
| `backend/.env` | `LTI_ISSUER`, `LTI_CLIENT_ID`, `LTI_DEPLOYMENT_ID`, `LTI_JWKS_URL`, `LTI_AUTH_LOGIN_URL`, `LTI_TOKEN_URL` de Moodle; `LTI_TOOL_PRIVATE_KEY_PATH` apunta a `%USERPROFILE%\.aerg-lti\tool_private.pem` (fuera del repositorio) |

## Flujo verificado en cada ejecución

1. El docente inicia sesión en Moodle y abre la actividad (launch OIDC: Moodle → `/api/lti/launch` → `auth.php` de Moodle → `/api/lti/callback`).
2. El backend valida el `id_token` (firma con el JWKS de Moodle, `iss`, `aud`, `deployment_id`), crea o reutiliza el usuario por `sub` (rol Instructor), guarda el *lineitem* AGS y el contexto en `assignments`, y redirige a `/evaluar` con el token de sesión. El script comprueba que el token ya no está en la URL.
3. El docente sube un trabajo con `student_identifier = 4` (id LTI del alumno, sin nombre), la rúbrica publicada genera una propuesta con Gemini y el docente la aprueba.
4. El backend obtiene un `access_token` (client_credentials con `client_assertion` firmada con la llave de la herramienta) y publica el *Score* en `<lineitem>/scores`.
5. Se compara la calificación enviada (`final_total_score` de la respuesta de aprobación) con la recibida (`m_grade_grades.finalgrade` del alumno en la actividad), y se captura el libro de calificaciones.

## Resultados (24 ejecuciones: 2 tandas de 10 y una tercera tanda detenida tras 4)

| Ejecución | Resultado | Calificación enviada | Calificación recibida en Moodle | Tiempo (s) | Causa del fallo | Capturas |
|---|---|---|---|---|---|---|
| 1-01 | Fallo | — | — | 128.7 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda1/ejecucion_01_error.png) |
| 1-02 | Fallo | — | — | 126.1 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda1/ejecucion_02_error.png) |
| 1-03 | Fallo | — | — | 126.9 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda1/ejecucion_03_error.png) |
| 1-04 | Fallo | — | — | 126.3 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda1/ejecucion_04_error.png) |
| 1-05 | Éxito | 15 | 15 | 29.3 | — | [launch](tanda1/ejecucion_05_1_asistente_tras_launch.png) · [aprobada](tanda1/ejecucion_05_2_aprobada.png) · [libro](tanda1/ejecucion_05_3_libro_calificaciones.png) |
| 1-06 | Éxito | 35 | 35 | 39.1 | — | [launch](tanda1/ejecucion_06_1_asistente_tras_launch.png) · [aprobada](tanda1/ejecucion_06_2_aprobada.png) · [libro](tanda1/ejecucion_06_3_libro_calificaciones.png) |
| 1-07 | Éxito | 15 | 15 | 41.1 | — | [launch](tanda1/ejecucion_07_1_asistente_tras_launch.png) · [aprobada](tanda1/ejecucion_07_2_aprobada.png) · [libro](tanda1/ejecucion_07_3_libro_calificaciones.png) |
| 1-08 | Éxito | 50 | 50 | 38.2 | — | [launch](tanda1/ejecucion_08_1_asistente_tras_launch.png) · [aprobada](tanda1/ejecucion_08_2_aprobada.png) · [libro](tanda1/ejecucion_08_3_libro_calificaciones.png) |
| 1-09 | Fallo | — | — | 126 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda1/ejecucion_09_error.png) |
| 1-10 | Éxito | 35 | 35 | 31.4 | — | [launch](tanda1/ejecucion_10_1_asistente_tras_launch.png) · [aprobada](tanda1/ejecucion_10_2_aprobada.png) · [libro](tanda1/ejecucion_10_3_libro_calificaciones.png) |
| 2-01 | Fallo | — | — | 126.3 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda2/ejecucion_01_error.png) |
| 2-02 | Éxito | 25 | 25 | 26.3 | — | [launch](tanda2/ejecucion_02_1_asistente_tras_launch.png) · [aprobada](tanda2/ejecucion_02_2_aprobada.png) · [libro](tanda2/ejecucion_02_3_libro_calificaciones.png) |
| 2-03 | Éxito | 25 | 25 | 26.7 | — | [launch](tanda2/ejecucion_03_1_asistente_tras_launch.png) · [aprobada](tanda2/ejecucion_03_2_aprobada.png) · [libro](tanda2/ejecucion_03_3_libro_calificaciones.png) |
| 2-04 | Éxito | 50 | 50 | 27.7 | — | [launch](tanda2/ejecucion_04_1_asistente_tras_launch.png) · [aprobada](tanda2/ejecucion_04_2_aprobada.png) · [libro](tanda2/ejecucion_04_3_libro_calificaciones.png) |
| 2-05 | Fallo | — | — | 126.1 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda2/ejecucion_05_error.png) |
| 2-06 | Fallo | — | — | 126.8 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda2/ejecucion_06_error.png) |
| 2-07 | Fallo | — | — | 126.5 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda2/ejecucion_07_error.png) |
| 2-08 | Fallo | — | — | 126 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda2/ejecucion_08_error.png) |
| 2-09 | Fallo | — | — | 125.9 | Gemini no generó la propuesta (HTTP 5xx/timeout); no se llegó al envío LTI | [error](tanda2/ejecucion_09_error.png) |
| 2-10 | Éxito | 50 | 50 | 26.6 | — | [launch](tanda2/ejecucion_10_1_asistente_tras_launch.png) · [aprobada](tanda2/ejecucion_10_2_aprobada.png) · [libro](tanda2/ejecucion_10_3_libro_calificaciones.png) |
| 3-01 | Fallo | — | — | 126 | Gemini respondió 429 (cuota/limite de tasa agotado); no se llegó al envío LTI | [error](tanda3/ejecucion_01_error.png) |
| 3-02 | Fallo | — | — | 126 | Gemini respondió 429 (cuota/limite de tasa agotado); no se llegó al envío LTI | [error](tanda3/ejecucion_02_error.png) |
| 3-03 | Fallo | — | — | 125.9 | Gemini respondió 429 (cuota/limite de tasa agotado); no se llegó al envío LTI | [error](tanda3/ejecucion_03_error.png) |
| 3-04 | Fallo | — | — | 125.9 | Gemini respondió 429 (cuota/limite de tasa agotado); no se llegó al envío LTI | [error](tanda3/ejecucion_04_error.png) |

## Resumen

| Indicador | Valor |
|---|---|
| Ejecuciones totales | 24 (tanda 3 detenida tras 4 ejecuciones) |
| Éxitos de punta a punta | 9 de 24 |
| Fallos | 15, **todos** en la generación con Gemini: tandas 1 y 2, 10 `GEMINI_HTTP_ERROR` por 503/504 y 1 `GEMINI_TIMEOUT`; tanda 3, 4 `GEMINI_HTTP_ERROR` por **429** (cuota agotada). Todos quedaron como incidencias en `incident_logs` |
| Fallos atribuibles a LTI (launch, sesión, token AGS, envío de score) | **0** |
| Ejecuciones que llegaron a la aprobación | 9; en las 9 la calificación recibida en Moodle **coincide exactamente** con la enviada |
| Tiempo medio de una ejecución exitosa | 31.8 s (incluye la generación con Gemini) |

Además, una corrida de prueba previa a las tandas (no incluida en la tabla) terminó con éxito: enviada 35, recibida 35.

## Conclusión

La cadena LTI 1.3 (launch OIDC, sesión del docente, token AGS por OAuth2 y envío de la calificación) funcionó en el **100 % de las ejecuciones que llegaron a ella (9/9)**. En las 24 ejecuciones el launch y la entrada al asistente fueron correctos, y en las 9 aprobaciones la calificación recibida en Moodle coincidió exactamente con la enviada.

La meta de 10 ejecuciones exitosas de punta a punta **no se alcanzó** por la API de Gemini, ajena a la integración: errores 503/504 intermitentes en las tandas 1 y 2, y en la tanda 3 un **429** constante, que indica que se agotó la cuota o el límite de tasa del proyecto. La tanda 3 se detuvo tras 4 fallos seguidos, porque las demás ejecuciones fallarían igual hasta que se restablezca la cuota.

**Pendiente para cerrar I6 con 10/10:** revisar en Google Cloud la cuota y los límites de tasa del modelo, o esperar a que se restablezcan, y ejecutar desde `frontend/` `node e2e/flujo_lti_moodle.mjs 10 ../docs/evidencias/LTI/tanda4`.
