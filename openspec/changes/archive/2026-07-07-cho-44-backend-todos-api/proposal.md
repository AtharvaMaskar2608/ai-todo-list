# Change: backend-todos-api

## Why

The Todo app needs its core REST surface so the frontend and AI assistant can
read and mutate tasks over HTTP. `backend-core` provides the persistence and
business logic (models, schemas, CRUD, DB session, app skeleton) but ships no
`/todos` routes. This change adds the thin HTTP layer that exposes the five
CRUD endpoints defined in the frozen REST contract (CONTRACTS.md §2), delegating
all behavior to `crud.*`.

## What Changes

- Add `backend/app/routers/todos.py`: an `APIRouter` (prefix `/todos`) with five
  endpoints — list, get-by-id, create, update, delete — each using
  `Depends(get_db)` and delegating to the corresponding `crud.*` function.
- Add `backend/app/routers/__init__.py` (package marker) if not already present.
- Add `backend/tests/test_todos_api.py`: httpx/TestClient tests covering all five
  endpoints and their status codes.
- Routes contain no business logic: no ORM queries, no validation beyond Pydantic
  schema binding, no ordering/filtering — all of that lives in `crud.*`.

Out of scope (owned elsewhere, not edited here): `main.py`, `crud.py`,
`schemas.py`, `models.py`, `database.py`, `requirements.txt` (all `backend-core`),
and `routers/agent.py` (`backend-agent`).

## Capabilities

### New Capabilities

- `todos-rest-api`: the `/todos` REST endpoints (GET list, GET by id, POST, PUT,
  DELETE) that expose CRUD over HTTP with correct status codes (200/201/204/404/422),
  delegating to `crud.*` via `Depends(get_db)`.

### Modified Capabilities

None.

## Impact

- Depends on `backend-core` (CONTRACTS.md §1) landing first: requires
  `crud.list_todos/get_todo/create_todo/update_todo/delete_todo`, the Pydantic
  schemas `TodoCreate`/`TodoUpdate`/`TodoResponse`, the `get_db` dependency, and a
  `main.py` that already includes `routers.todos` via a guarded import (so this
  change never edits `main.py`).
- New files only: `backend/app/routers/todos.py`, `backend/app/routers/__init__.py`,
  `backend/tests/test_todos_api.py`. No shared/contract files are modified, so this
  change is safe to fan out in parallel with the frontend and agent changes once
  `backend-core` is on `main`.
- Affected spec: `todos-rest-api` (new).
