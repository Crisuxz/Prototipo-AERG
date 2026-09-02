# Backend

FastAPI + SQLAlchemy + Alembic + SQLite. Ver `docs/PLAN_MAESTRO.md` para la arquitectura completa.

## Arranque en desarrollo

```bash
python -m venv .venv
./.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env       # completar GEMINI_API_KEY cuando se necesite
uvicorn app.main:app --reload
```

Verificar: `GET http://localhost:8000/api/health` -> `{"status": "ok"}`.
