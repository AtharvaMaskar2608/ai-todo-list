## 1. Project skeleton & dependencies
- [x] 1.1 Create `backend/app/__init__.py` (empty package marker) — files: backend/app/__init__.py. Done: `python -c "import app"` works from backend/.
- [x] 1.2 Add `backend/requirements.txt` with fastapi, uvicorn[standard], sqlalchemy, pydantic, pydantic-settings, anthropic, python-dotenv — files: backend/requirements.txt. Done: `pip install -r requirements.txt` succeeds. (Only backend-core may touch deps.)

## 2. Configuration
- [x] 2.1 Implement `Settings` (pydantic-settings) with `DATABASE_URL="sqlite:///./todo.db"`, `CORS_ORIGINS` (list), `ANTHROPIC_API_KEY` (env), `ANTHROPIC_MODEL="claude-sonnet-4-6"`, plus `get_settings()` — files: backend/app/config.py. Contract: CONTRACTS.md §1 Infra/config. Done: `get_settings().ANTHROPIC_MODEL == "claude-sonnet-4-6"`.

## 3. Database infrastructure
- [x] 3.1 Create `engine`, `SessionLocal`, `Base`, and `get_db()` generator dependency (yield/close) — files: backend/app/database.py. Contract: `get_db()` per CONTRACTS.md §1. Done: importing `get_db` and iterating yields one closable Session.

## 4. Data model
- [x] 4.1 Define `Todo` model: id PK autoincrement, title String(100) not null, description String(500) nullable, completed Boolean default False, created_at/updated_at DateTime UTC (default now, updated_at onupdate now) — files: backend/app/models.py. Contract: CONTRACTS.md §1 model. Done: `Base.metadata.create_all` builds a `todos` table with these columns.

## 5. Schemas
- [x] 5.1 Define `TodoBase` (title trimmed 1..100, description<=500 optional), `TodoCreate`, `TodoUpdate` (all optional partial), `TodoResponse` (id, completed, created_at, updated_at, `ConfigDict(from_attributes=True)`) — files: backend/app/schemas.py. Contract: CONTRACTS.md §1 schemas. Done: empty/over-long titles raise ValidationError; `TodoResponse.model_validate(todo_obj)` works.

## 6. CRUD business logic
- [x] 6.1 Implement `list_todos(db)` newest-first and `get_todo(db, id)` (None if missing) — files: backend/app/crud.py. Contract: CONTRACTS.md §1 crud. Done: list ordered created_at DESC; get returns None for unknown id.
- [x] 6.2 Implement `create_todo(db, data)` and `update_todo(db, id, data)` (partial via exclude_unset, None if missing, refreshes updated_at) — files: backend/app/crud.py. Done: create returns persisted row w/ id+timestamps; partial update changes only provided fields.
- [x] 6.3 Implement `delete_todo(db, id) -> bool`, `search_todos(db, query)` case-insensitive title OR description newest-first, `delete_completed(db) -> int` — files: backend/app/crud.py. Done: delete returns True/False; search case-insensitive; delete_completed returns count.

## 7. Application factory
- [x] 7.1 Implement `create_app()`: CORS from settings, `Base.metadata.create_all(engine)` on startup, `GET /health` -> `{"status":"ok"}`, and guarded includes of `routers.todos` + `routers.agent` (skip missing module without error) — files: backend/app/main.py. Contract: CONTRACTS.md §1 Infra/main. Done: app boots with no routers present and `/health` returns ok.

## 8. Done condition & tests
- [x] 8.1 Verify boot & health: done = `uvicorn app.main:app` boots cleanly (no routers required) and `GET /health` returns 200 `{"status":"ok"}` — files: backend/app/main.py. Test command: `cd backend && uvicorn app.main:app` + curl /health.
- [x] 8.2 Add and run CRUD tests covering ordering, partial update, search case-insensitivity, delete_completed count, and get/delete-missing behavior — files: backend/tests/test_crud.py. Done = pytest for crud passes. Test command: `cd backend && pytest`.
