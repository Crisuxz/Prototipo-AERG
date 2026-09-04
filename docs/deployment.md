# Despliegue

Topología objetivo (Parte 15 del plan): **un solo nodo**. En la misma máquina corren el
backend con uvicorn, el frontend ya compilado servido como estáticos, la base SQLite y
un proxy inverso que termina TLS. No hay colas, ni workers, ni servicios auxiliares:
el prototipo evalúa un trabajo a la vez de forma síncrona (D4).

```
Internet ──HTTPS──▶ nginx / Caddy ──┬──▶  /            → frontend/dist (estáticos)
                                     └──▶  /api, /docs → uvicorn 127.0.0.1:8000
                                                              │
                                                        app.db + uploads/
```

## 1. Requisitos del servidor

- Linux con Python 3.14 y Node.js 22 (Node sólo hace falta para compilar el frontend;
  puede compilarse en otra máquina y subir `dist/`).
- nginx o Caddy.
- Salida HTTPS hacia `generativelanguage.googleapis.com`.
- Un usuario de sistema sin privilegios para ejecutar el servicio.

## 2. Variables de entorno

`backend/.env` (nunca versionado; permisos `600`):

| Variable | Producción | Notas |
|---|---|---|
| `ENV` | `prod` | Cambia el nivel de log a INFO |
| `DATABASE_URL` | `sqlite:////var/lib/aerg/app.db` | Ruta absoluta, fuera del directorio de código |
| `CORS_ORIGINS` | `https://tu-dominio` | Lista separada por comas. **No usar `*`** |
| `AUTH_TOKEN` | valor aleatorio largo | Debe coincidir con `VITE_API_TOKEN` del frontend |
| `GEMINI_API_KEY` | tu clave | Único secreto del proveedor de IA |
| `GEMINI_MODEL` | `gemini-2.5-flash` | |
| `GEMINI_TIMEOUT_SECONDS` | `30` | |
| `MAX_UPLOAD_MB` | `10` | Debe ser ≤ `client_max_body_size` del proxy |
| `MAX_SUBMISSION_CHARS` | `200000` | Umbral de truncado del texto enviado al modelo |
| `UPLOAD_DIR` | `/var/lib/aerg/uploads` | Fuera del árbol servido por el proxy |
| `LTI_ISSUER`, `LTI_CLIENT_ID`, `LTI_DEPLOYMENT_ID`, `LTI_JWKS_URL`, `LTI_AUTH_LOGIN_URL` | sólo si se usa LTI 1.3 | Vacías activan `LTI_NOT_CONFIGURED` |

`frontend/.env`:

```
VITE_API_BASE_URL=/api
VITE_API_TOKEN=<el mismo valor de AUTH_TOKEN>
```

Genera el token con `python -c "import secrets; print(secrets.token_urlsafe(32))"`.

## 3. Procedimiento de instalación

```bash
# 1. Código y dependencias
git clone <repo> /opt/aerg && cd /opt/aerg/backend
python3.14 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. Datos
sudo mkdir -p /var/lib/aerg/uploads
sudo chown -R aerg:aerg /var/lib/aerg

# 3. Configuración
cp .env.example .env && chmod 600 .env   # y edita los valores de la tabla anterior

# 4. Esquema y datos semilla
.venv/bin/alembic upgrade head

# 5. Frontend
cd ../frontend && npm ci && npm run build   # genera frontend/dist
```

`alembic upgrade head` es idempotente y es el paso obligatorio en cada despliegue
nuevo y en cada actualización: crea el esquema y siembra el docente de prueba y la
integración `SIMULATOR`.

## 4. Servicio

`/etc/systemd/system/aerg.service`:

```ini
[Unit]
Description=Asistente de Evaluacion Automatizada (AERG)
After=network.target

[Service]
User=aerg
WorkingDirectory=/opt/aerg/backend
EnvironmentFile=/opt/aerg/backend/.env
ExecStart=/opt/aerg/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now aerg
```

uvicorn escucha **sólo en localhost**: todo el tráfico externo pasa por el proxy.

## 5. Proxy inverso

Los archivos de ejemplo están en `deployment/` (`Caddyfile` y `nginx.conf`). Puntos
que no se deben omitir:

- Terminación TLS con certificado válido (RS-04): el token de autenticación viaja en
  cada petición y sin HTTPS quedaría expuesto.
- `client_max_body_size` (nginx) o `request_body max_size` (Caddy) coherente con
  `MAX_UPLOAD_MB`.
- Fallback SPA: cualquier ruta que no sea `/api` devuelve `index.html`, porque el
  enrutado lo hace react-router en el cliente.
- El directorio de subidas **no** se sirve como estático.

## 6. Actualización

```bash
cd /opt/aerg && git pull
cd backend && .venv/bin/pip install -r requirements.txt && .venv/bin/alembic upgrade head
cd ../frontend && npm ci && npm run build
sudo systemctl restart aerg
```

## 7. Respaldo

Todo el estado vive en dos rutas:

```bash
sqlite3 /var/lib/aerg/app.db ".backup '/backups/app-$(date +%F).db'"
tar czf /backups/uploads-$(date +%F).tar.gz -C /var/lib/aerg uploads
```

Usa `.backup` y no `cp`: copiar el archivo con el servicio en marcha puede producir
una base inconsistente.

## 8. Observabilidad

Los logs van a stdout y los recoge systemd (`journalctl -u aerg -f`). Además, todo
fallo funcional relevante queda en la tabla `incident_logs`, consultable vía
`GET /api/incidents`, con su tipo, severidad y detalle. Los detalles se redactan antes
de persistirse: ningún secreto aparece en ellos.

Comprobación rápida tras desplegar:

```bash
curl -s https://tu-dominio/api/health
curl -s -H "Authorization: Bearer $AUTH_TOKEN" https://tu-dominio/api/rubrics
```

## 9. Migración a PostgreSQL

El dominio no depende de SQLite. Para migrar basta instalar `psycopg`, apuntar
`DATABASE_URL` a la instancia de PostgreSQL y ejecutar `alembic upgrade head` sobre la
base vacía: los enums se persisten como cadenas y los campos estructurados como JSON,
de modo que no hay tipos específicos de SQLite en el esquema.

## 10. Advertencia de alcance

Este es un prototipo de tesis. La autenticación es un token compartido de un único
docente (D8), no hay control de acceso multiusuario ni cifrado en reposo. **No debe
desplegarse con datos reales de estudiantes** sin antes sustituir el mecanismo de
autenticación y revisar el tratamiento de datos personales.
