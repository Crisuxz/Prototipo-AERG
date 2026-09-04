# Deployment

Artefactos de despliegue del prototipo (Parte 15 del plan). El procedimiento completo
—requisitos, variables, instalacion, actualizacion, respaldo y migracion a
PostgreSQL— esta en [`../docs/deployment.md`](../docs/deployment.md).

| Archivo | Uso |
|---|---|
| `.env.production.example` | Plantilla de `backend/.env` para produccion |
| `aerg.service` | Unidad systemd del backend (uvicorn en 127.0.0.1:8000) |
| `Caddyfile` | Proxy inverso con TLS automatico (opcion recomendada) |
| `nginx.conf` | Proxy inverso alternativo, con TLS gestionado por certbot |

Topologia: un solo nodo. Caddy o nginx sirve `frontend/dist` como estaticos y hace
proxy de `/api`, `/docs` y `/openapi.json` al backend. La base SQLite y el directorio
de subidas viven en `/var/lib/aerg`, fuera del arbol servido.
