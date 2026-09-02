# Deployment

Configuracion de despliegue del prototipo (ver `docs/PLAN_MAESTRO.md`, Parte 15).

Contenido previsto en iteraciones posteriores:
- Configuracion de proxy inverso (nginx/Caddy) para servir el frontend compilado y hacer proxy al backend.
- Variables de entorno de despliegue.
- Instrucciones de arranque en modo produccion (`uvicorn` + `vite build`).

Por ahora, el arranque en desarrollo se documenta en `docs/PLAN_MAESTRO.md` (Parte 111) y en los `README.md` de `backend/` y `frontend/`.
