## Why
The Todo app's backend needs a single, authoritative foundation (data model, schemas, business logic, app factory, config) that dependent changes (`backend-todos-api`, `backend-agent`) build on. Landing it first prevents contract drift and file-write conflicts during parallel fan-out.

## What Changes
- Add the SQLAlchemy `Todo` model (id, title, description, completed, created_at, updated_at) with UTC timestamps.
- Add Pydantic v2 schemas: `TodoBase`, `TodoCreate`, `TodoUpdate` (partial), `TodoResponse` (from_attributes).
- Add sync CRUD business logic: `list_todos`, `get_todo`, `create_todo`, `update_todo`, `delete_todo`, `search_todos`, `delete_completed`.
- Add DB infrastructure: `engine`, `SessionLocal`, `Base`, `get_db()` dependency (backend/app/database.py).
- Add `Settings` (pydantic-settings) with `DATABASE_URL`, `CORS_ORIGINS`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL="claude-sonnet-4-6"`, exposed via `get_settings()`.
- Add `create_app()` factory: CORS middleware, table bootstrap on startup, `GET /health`, and up-front guarded includes of `routers.todos` + `routers.agent` (so router changes never edit main.py).
- Add `backend/requirements.txt` (the ONLY backend change permitted to touch deps) and `backend/app/__init__.py`.
- This is the shared backend contract; no BREAKING changes (greenfield).

## Capabilities

### New Capabilities
- `todo-persistence`: The `Todo` ORM model, Pydantic request/response schemas, and CRUD business logic that own all data validation, ordering, search, and mutation semantics.
- `backend-foundation`: The FastAPI application factory, settings/config, CORS, `/health`, DB session dependency, and table bootstrap that host every router.

### Modified Capabilities
None — this is the first backend change; no existing OpenSpec specs exist yet to modify.

## Impact
- New files: backend/app/{__init__.py,database.py,models.py,schemas.py,crud.py,config.py,main.py}, backend/requirements.txt.
- Systems: introduces the SQLite database (`todo.db`), the FastAPI app object, and CORS policy.
- This is the shared backend contract (CONTRACTS.md §1). It MUST land on `main` before `backend-todos-api` and `backend-agent` fan out. It is the only backend change allowed to modify requirements.txt, main.py, and config.
