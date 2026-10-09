# Reporte de cobertura de requisitos — rama `cobertura-requisitos`

Fecha: 2026-10-09. Toda la evidencia está en `docs/evidencias/` y viene de ejecuciones reales en la máquina de desarrollo.

## 1. Requisitos

| Req. | Qué se hizo | Archivos tocados | Prueba / evidencia | Resultado | Nivel final |
|---|---|---|---|---|---|
| RF-05 | Prueba que construye a mano un PDF 1.4 mínimo con texto en Helvetica y verifica `extracted_text` | `backend/tests/integration/test_submissions_api.py` | `test_rf05_pdf_con_capa_de_texto_extrae_el_texto` · `evidencias/RF-05/pytest_rf05.txt` | Pasa | **Cubierto** (el OCR de PDF escaneados queda fuera de alcance) |
| RI-07 | Pruebas con `monkeypatch` de `SimulatorAdapter.send_result`: fallo y excepción. La excepción daba **500 sin incidencia**; se corrigió capturándola en `EvaluationService._send_to_lms` | `backend/app/services/evaluation_service.py`, `test_evaluations_api.py` | 2 pruebas `test_ri07_*` · `evidencias/RI-07/pytest_ri07.txt` | Pasa: sigue `APPROVED` y se registra `LMS_SEND_FAILED` | **Cubierto** |
| RS-06 | Prueba con frase única + error forzado de Gemini; revisa `caplog`, `/api/incidents` y la respuesta | `backend/tests/security/test_seguridad.py` | `test_rs06_*` · `evidencias/RS-06/pytest_rs06.txt` | Pasa: ni la frase ni la clave aparecen | **Cubierto** |
| RI-04 (complemento) | Trabajo de 20 000 caracteres con límite de 5 000 | `test_evaluations_api.py` | `test_ri04_*` · `evidencias/RI-04/pytest_ri04.txt` | Pasa: Gemini recibe 5 000 caracteres y se registra `SUBMISSION_TRUNCATED` | Cubierto |
| RS-01 | El callback LTI busca o crea el `User` por `sub` (source=LMS), solo deja pasar Instructor/Administrator, emite un JWT HS256 de sesión y redirige al frontend; `get_current_user` acepta `AUTH_TOKEN` o la sesión; el frontend guarda el token en sessionStorage | `core/config.py`, `core/security.py`, `api/deps.py`, `services/auth_service.py` (nuevo), `api/routes/lms.py`, `frontend/src/services/apiClient.ts`, `.env.example` | 4 pruebas `test_rs01_*` (Instructor entra, sesión expirada → 401, secreto ajeno → 401, Learner → 403) · `evidencias/RS-01/` · launch real con Moodle (`evidencias/LTI/`) | Pasa | **Cubierto** |
| RNF-05 | Caddy 2 con `tls internal`, proxy de `/api` hacia el backend del host y archivos estáticos de `frontend/dist` | `deployment/docker-compose.https.yml`, `deployment/https/Caddyfile` | `evidencias/RNF-05/curl_https_health.txt` (200 por HTTPS), `openssl_certificado_tls.txt` (TLS 1.3, `TLS_AES_128_GCM_SHA256`, SAN `localhost`, emisor "Caddy Local Authority") | Pasa | **Cubierto** (entorno local con CA interna; en producción hace falta un certificado público) |
| RS-04 | Igual que RNF-05, más la redirección de HTTP a HTTPS | Los mismos | `evidencias/RNF-05/curl_http_redireccion.txt`: `301` → `https://localhost:8443/...` | Pasa | **Cubierto** |
| RNF-06 | Playwright: 6 pantallas × 3 tamaños con verificación automática de `scrollWidth <= innerWidth`. Antes **7/18**; se corrigió `AppLayout` (barra superior bajo `lg`, `min-w-0`) | `frontend/src/layouts/AppLayout.tsx`, `frontend/e2e/capturas_rnf06.mjs`, `scripts/evidencias/sembrar_datos.py` | `evidencias/RNF-06/` (antes/después, 36 capturas, tablas resumen) | **18/18** sin desbordamiento | **Cubierto** |
| RNF-07 | Evaluación heurística (Nielsen, 1994): 13 hallazgos, 2 de severidad 3 corregidos (desbordamiento y aviso falso de "enviado al LMS"), ninguno de severidad 4 | `ReviewEvaluationPage.tsx`, `StatusBadge.tsx`, `HistoryTable.tsx`, `frontend/e2e/aprobar_y_capturar.mjs` | `evidencias/RNF-07/evaluacion_heuristica.md` + capturas antes/después | Severidad 3 corregida; severidad 1 y 2 documentadas como pendientes. Los tesistas validaron los 13 hallazgos el 2026-10-09 | **Cubierto** |
| RS-07 | Revisión de los términos de la API de Gemini (gratuito frente a pago) y rastreo en el código de todas las salidas de red | — (solo documentación) | `evidencias/RS-07/revision_terminos.md` | El nivel gratuito usa los datos para entrenar y prohíbe enviar datos personales; el de pago no los usa. La clave en uso está en el nivel de pago (facturación activa), confirmado por los tesistas el 2026-10-09 | **Cubierto** |
| RI-01 | Integración LTI 1.3 real con Moodle 4.5.15: launch OIDC, validación del `id_token`, JWKS de la herramienta | `lti13_adapter.py`, `lms_integration_service.py`, `routes/lms.py`, `scripts/evidencias/moodle_preparar_lti.php` | `evidencias/LTI/lista_I6.md` (20/20 launches correctos) | Pasa | **Cubierto** |
| RI-08 | Prueba de punta a punta con Playwright contra Moodle: 2 tandas de 10 y una tercera detenida tras 4 | `frontend/e2e/flujo_lti_moodle.mjs` | `evidencias/LTI/lista_I6.md`, `tanda1/`, `tanda2/`, `tanda3/` | **9/24 de punta a punta**; los 15 fallos son de Gemini (503/504/timeout y, en la tanda 3, 429 por cuota agotada) y ninguno de LTI: 9/9 envíos LTI correctos | **Parcial**: falta una tanda de 10/10 cuando se restablezca la cuota de Gemini |
| RF-20 | El Score AGS se publica en el *lineitem* del launch, guardado en `assignments` (migración nueva) | `models/assignment.py`, migración `c7d2e4a1f9b3`, `lti13_adapter.py`, `frontend/src/services/submissionsApi.ts` | `test_lti_ags.py` + 9 envíos reales con calificación enviada igual a la recibida | Pasa | **Cubierto** |
| RI-06 | Token OAuth2 `client_credentials` con `client_assertion` JWT, caché hasta su expiración y manejo de errores 4xx/5xx | `lti13_adapter.py`, `config.py` | 16 pruebas en `tests/integration/test_lti_ags.py` (`evidencias/LTI/pytest_ags.txt`) + 9/9 envíos reales a Moodle | Pasa | **Cubierto** |

## 2. Pruebas

Antes: 109. Ahora: **134** (+25), todas en verde. Salida real de `pytest tests -q` por carpeta:

```text
unit: 30 passed in 0.03s
integration: 74 passed in 7.24s
functional: 11 passed in 1.52s
security: 19 passed in 1.80s
134 passed in 10.10s
```

Pruebas nuevas: RF-05 (1), RI-07 (2), RI-04 (1), RS-06 (1), RS-01 (4) y AGS/JWKS/launch (16).

## 3. Versiones usadas

| Componente | Versión |
|---|---|
| Moodle | 4.5.15 (Build: 20261005), rama `MOODLE_405_STABLE`, con moodlehq/moodle-docker y PostgreSQL, en el puerto 8081 |
| Caddy | v2.11.7 (imagen `caddy:2`) |
| Playwright | 1.64.0 (Chromium headless shell 156.0.8078.4) |
| Docker | 29.8.2 |

## 4. Cambios de comportamiento (para la tesis, secciones 3.4.2, 3.5, 3.6.1 y 3.6.2)

**Endpoints**
- `POST /api/lti/callback`: antes devolvía JSON con los claims. Ahora identifica al docente, **rechaza con 403** a quien no tenga el rol Instructor o Administrator, registra la actividad del launch y responde **303** a `FRONTEND_URL/evaluar#session_token=…&assignment_id=…`.
- `GET /api/lti/jwks` (**nuevo**, público): devuelve la llave pública de la herramienta, o 409 si no está configurada.
- Las rutas protegidas aceptan `Authorization: Bearer <AUTH_TOKEN>` **o** un token de sesión JWT HS256. Con el token de sesión, el usuario autenticado es el docente del LMS, no el de prueba.
- `POST /api/evaluations/{id}/approve`: si el adaptador LMS lanza una excepción, la aprobación se conserva y se registra `LMS_SEND_FAILED`. Antes devolvía 500.

**Settings nuevos**: `SESSION_SECRET`, `SESSION_TTL_HOURS` (8), `FRONTEND_URL`, `LTI_TOKEN_URL` y `LTI_TOOL_PRIVATE_KEY_PATH`.

**Migración**: `c7d2e4a1f9b3` agrega a `assignments` dos columnas nullable, `lti_lineitem_url` y `lti_context_id`.

**Servicios**: `AuthService` es nuevo. `LMSIntegrationService.register_lti_launch` es nuevo. `LTI13Adapter` ahora obtiene su propio `access_token` y lo guarda en caché, y usa el *lineitem* del launch. La configuración LTI del `.env` se combina con la de la integración guardada en la base de datos.

**Frontend**:
- El token de sesión y la actividad del launch se guardan en sessionStorage.
- Los trabajos subidos después de un launch se asocian a esa actividad.
- La barra lateral se convierte en barra superior en tableta y móvil.
- La notificación al aprobar distingue "enviada" de "no se pudo enviar", y el historial muestra el estado "Aprobada, sin enviar".

**Despliegue**: `deployment/docker-compose.https.yml` y `deployment/https/Caddyfile` sirven para verificar HTTPS en local.

**Pruebas**: `conftest.py` ya no lee `backend/.env`, así que la suite no depende de la configuración local.

## 5. Problemas y soluciones

| Problema | Solución |
|---|---|
| Si el adaptador LMS lanzaba una excepción, se producía un 500 y no quedaba incidencia (lo detectó la prueba de RI-07) | Se captura en `_send_to_lms`, que la convierte en `LMS_SEND_FAILED` |
| 11 de 18 combinaciones de pantalla y tamaño desbordaban horizontalmente | Ajustes mínimos de Tailwind en `AppLayout` |
| La interfaz decía "enviada al LMS" aunque el envío hubiera fallado | Se basa en `sent_to_lms_at` |
| En Windows, el `curl` (schannel) no muestra el certificado | Se complementó con `openssl s_client` |
| Moodle tardaba unos 20 s por página por el *bind mount* de Windows | Código y datos de Moodle copiados a volúmenes de Docker (`local.yml` fuera del repositorio). Ahora tarda unos 0,36 s |
| El contenedor de Moodle no alcanzaba al backend escuchando en `127.0.0.1` | El backend escucha en `0.0.0.0:8000` |
| Desde el host, el firewall bloquea `host.docker.internal` (IP de la LAN) | El navegador de Playwright resuelve ese nombre a `127.0.0.1` (`--host-resolver-rules`); las URLs registradas en Moodle no cambian |
| Moodle bloquea por defecto las peticiones a IPs privadas | `curlsecurityblockedhosts` vacío, **solo en el Moodle local** |
| La prueba del JWKS heredaba la llave configurada en `backend/.env` | `Settings(_env_file=None)` en `conftest.py` |
| Gemini respondió 503/504 de forma intermitente en las tandas 1 y 2 (11 de 20) y **429** (cuota/límite de tasa agotado) en las 4 ejecuciones de la tanda 3 | No tiene solución desde el código; quedó registrado como incidencia. La tanda 3 se detuvo tras 4 fallos seguidos por 429 (ver RI-08) |
| Al editar `lti13_adapter.py` se borró por accidente la clase `LaunchRequest` | Las pruebas lo detectaron y se restauró antes del commit |

## Pendientes para los tesistas

1. ~~Validar la evaluación heurística~~: hecho el 2026-10-09.
2. ~~Confirmar la facturación de la clave de Gemini~~: confirmada el 2026-10-09 (nivel de pago).
3. **Cerrar RI-08 con 10/10.** Revisar en Google Cloud (APIs y servicios → Cuotas) la cuota y el límite de tasa del modelo configurado en `GEMINI_MODEL`, ya que la tanda 3 recibió 429 aunque la facturación está activa. Cuando se restablezca, ejecutar desde `frontend/` (con backend, Vite y Moodle en marcha) `node e2e/flujo_lti_moodle.mjs 10 ../docs/evidencias/LTI/tanda4`.

## Resumen de niveles

**12 de 13 requisitos cubiertos.** Solo RI-08 queda **Parcial**, por la disponibilidad de Gemini y no por la integración LTI.
