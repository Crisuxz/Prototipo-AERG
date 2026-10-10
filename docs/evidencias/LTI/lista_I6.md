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

## Resultados (41 ejecuciones registradas en 5 tandas)

Tandas 1 a 3 con `gemini-3.5-flash`. Tandas 4 y 5 con `gemini-3.8-flash` y una clave nueva: `gemini-2.5-flash` ya no está disponible para usuarios nuevos (404), y se cambió de clave por el 429 de la tanda 3. Una tanda previa con `gemini-3.8-flash` y la clave anterior se detuvo tras 3 éxitos (35, 25 y 15) al cambiar la clave, y no se incluye.

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
| 4-01 | Éxito | 35 | 35 | 40.5 | — | [launch](tanda4/ejecucion_01_1_asistente_tras_launch.png) · [aprobada](tanda4/ejecucion_01_2_aprobada.png) · [libro](tanda4/ejecucion_01_3_libro_calificaciones.png) |
| 4-02 | Fallo | — | — | 126.3 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda4/ejecucion_02_error.png) |
| 4-03 | Éxito | 15 | 15 | 39.3 | — | [launch](tanda4/ejecucion_03_1_asistente_tras_launch.png) · [aprobada](tanda4/ejecucion_03_2_aprobada.png) · [libro](tanda4/ejecucion_03_3_libro_calificaciones.png) |
| 4-04 | Éxito | 50 | 50 | 30.1 | — | [launch](tanda4/ejecucion_04_1_asistente_tras_launch.png) · [aprobada](tanda4/ejecucion_04_2_aprobada.png) · [libro](tanda4/ejecucion_04_3_libro_calificaciones.png) |
| 4-05 | Fallo | — | — | 126.2 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda4/ejecucion_05_error.png) |
| 4-06 | Fallo | — | — | 127.2 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda4/ejecucion_06_error.png) |
| 4-07 | Fallo | — | — | 127.2 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda4/ejecucion_07_error.png) |
| 4-08 | Fallo | — | — | 127.3 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda4/ejecucion_08_error.png) |
| 4-09 | Fallo | — | — | 127 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda4/ejecucion_09_error.png) |
| 4-10 | Fallo | — | — | 126.4 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda4/ejecucion_10_error.png) |
| 5-01 | Fallo | — | — | 127.4 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda5/ejecucion_01_error.png) |
| 5-02 | Fallo | — | — | 126.8 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda5/ejecucion_02_error.png) |
| 5-03 | Fallo | — | — | 126.3 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda5/ejecucion_03_error.png) |
| 5-04 | Fallo | — | — | 126.4 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda5/ejecucion_04_error.png) |
| 5-05 | Éxito | 15 | 15 | 35.9 | — | [launch](tanda5/ejecucion_05_1_asistente_tras_launch.png) · [aprobada](tanda5/ejecucion_05_2_aprobada.png) · [libro](tanda5/ejecucion_05_3_libro_calificaciones.png) |
| 5-06 | Fallo | — | — | 126.5 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda5/ejecucion_06_error.png) |
| 5-07 | Fallo | — | — | 127.3 | Gemini no generó la propuesta (503/504/timeout); no se llegó al envío LTI | [error](tanda5/ejecucion_07_error.png) |

## Resumen

| Indicador | Valor |
|---|---|
| Ejecuciones totales | 41 (10 + 10 + 4 + 10 + 7) |
| Éxitos de punta a punta | 13 de 41 (tandas 4-5: 4 de 17) |
| Fallos | 28, **todos** en la generación con Gemini (503, 504, timeout y, en la tanda 3, 429). Todos quedaron como incidencias en `incident_logs` |
| Fallos atribuibles a LTI (launch, sesión, token AGS, envío de score) | **0** |
| Ejecuciones que llegaron a la aprobación | 13; en las 13 la calificación recibida en Moodle **coincide exactamente** con la enviada |
| Tiempo medio de una ejecución exitosa | 31.8 s (incluye la generación con Gemini) |

Además, una corrida de prueba previa a las tandas (no incluida en la tabla) terminó con éxito: enviada 35, recibida 35.

## Conclusión

La cadena LTI 1.3 (launch OIDC, sesión del docente, token AGS por OAuth2 y envío de la calificación) funcionó en el **100 % de las ejecuciones que llegaron a ella (13/13)**. En las 41 ejecuciones el launch y la entrada al asistente fueron correctos, y en las 13 aprobaciones la calificación recibida en Moodle coincidió exactamente con la enviada.

La meta de 10 ejecuciones exitosas seguidas **no se alcanzó**. Todos los fallos ocurrieron en la generación de la propuesta con Gemini, con dos modelos (`gemini-3.5-flash` y `gemini-3.8-flash`) y dos claves distintas, así que no dependen de la integración LTI. Se agotó el máximo de 20 ejecuciones acordado para las tandas 4 y 5.

Para separar las dos causas, la evidencia de RI-08 puede leerse en dos partes:
- **Integración LTI:** 41/41 launches correctos y 13/13 calificaciones enviadas y recibidas iguales.
- **Flujo completo con IA:** 13/41, limitado por la disponibilidad de Gemini.
