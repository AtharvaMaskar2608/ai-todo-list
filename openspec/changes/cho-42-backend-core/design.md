## Context
This change translates CONTRACTS.md §1 (the frozen backend data & business-logic contract) and docs/project_context.md sections 26–30 into the shared backend foundation. Two dependent changes — `backend-todos-api` (REST routes) and `backend-agent` (agentic loop) — consume these signatures. Because they run in parallel after this lands, the foundation must fix every shared symbol exactly as CONTRACTS.md specifies and must avoid any file that a dependent change also needs to write.

## Goals / Non-Goals
**Goals:**
- Provide the exact `Todo` model, schemas, and CRUD signatures from CONTRACTS.md §1 so dependents compile against a stable contract.
- Provide a bootable `create_app()` with CORS, `/health`, and table creation so the skeleton runs standalone.
- Make router inclusion conflict-free: main.py references `routers.todos` and `routers.agent` up front, so router changes only CREATE their file and never edit main.py.
- Centralize config, including `ANTHROPIC_MODEL="claude-sonnet-4-6"`, in one settings object.

**Non-Goals:**
- No REST route handlers (owned by `backend-todos-api`, file routers/todos.py).
- No agent loop, tools, or `/agent/chat` (owned by `backend-agent`).
- No Alembic/migrations — `Base.metadata.create_all` is sufficient for SQLite here.
- No async DB layer.

## Decisions
- **Synchronous SQLAlchemy sessions.** CRUD functions take `Session` as their first positional arg (`def create_todo(db: Session, data: TodoCreate) -> Todo`). SQLite + FastAPI's threadpool make sync sessions simpler and fully adequate; async would add complexity dependents don't need. `get_db()` is a generator dependency that yields a `SessionLocal()` and closes it in `finally`.
- **`delete_completed` as a dedicated CRUD function.** Returning an `int` count (`def delete_completed(db: Session) -> int`) lets both the future REST layer and the agent tool reuse one bulk-delete path instead of N single deletes, matching the "Delete everything I've finished" agent use case and keeping business logic out of routes.
- **main.py avoids router write-conflicts via up-front guarded includes.** `create_app()` attempts `from app.routers import todos, agent` inside try/except (or importlib guards) and calls `app.include_router(...)` for whichever imported successfully. Because both include lines already exist in the foundation, `backend-todos-api` and `backend-agent` each only CREATE their router module; neither edits main.py, so the two parallel changes never touch the same file.
- **UTC timestamps.** `created_at` defaults to `datetime.now(timezone.utc)` and `updated_at` uses default + onupdate to the same, so ordering and freshness are timezone-correct and comparable. `list_todos`/`search_todos` order by `created_at DESC` (newest first) per contract.
- **Pydantic v2 semantics.** `TodoUpdate` has all-optional fields for partial updates; `update_todo` applies only provided fields (`exclude_unset`) and returns `None` when the id is missing. `TodoResponse` uses `ConfigDict(from_attributes=True)`.
- **Alternatives considered:** (a) auto-discovering routers by scanning `routers/` — rejected as more magic than the two-line guarded include needs; (b) each router change appends its own include to main.py — rejected because it creates a guaranteed merge conflict on main.py during fan-out.

## Risks / Trade-offs
- Guarded imports could silently swallow a real import error in a router → Mitigation: guard only `ModuleNotFoundError` for the not-yet-created module; let other exceptions propagate so genuine bugs surface.
- `create_all` cannot evolve the schema after data exists → Mitigation: acceptable for this greenfield SQLite app; note migrations as future work if the schema changes.
- Naive-vs-aware datetime mismatch on SQLite (stores naive) → Mitigation: consistently generate UTC via `datetime.now(timezone.utc)`; `TodoResponse.updated_at`/`created_at` typed as `datetime` per CONTRACTS.md.
- Sync sessions under heavy concurrency could block the threadpool → Mitigation: acceptable for a local SQLite todo app; documented as a scaling boundary, not a correctness issue.
