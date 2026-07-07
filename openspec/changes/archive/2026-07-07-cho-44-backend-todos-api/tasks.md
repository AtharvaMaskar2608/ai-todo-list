# Tasks: backend-todos-api

Dependency: `backend-core` must be on `main` first (provides `crud.*`, schemas,
`get_db`, and a `main.py` that already includes `routers.todos` via guarded
import). This change creates NEW files only and never edits `main.py`, `crud.py`,
`schemas.py`, `models.py`, `database.py`, or `requirements.txt`.

## 1. Router package scaffold

- [x] 1.1 Create `backend/app/routers/__init__.py` as a package marker (empty is
  fine) — files: backend/app/routers/__init__.py. Done: `python -c "import
  app.routers"` succeeds from `backend/` (import resolves).

## 2. Todos router endpoints

- [x] 2.1 Create `backend/app/routers/todos.py` with
  `router = APIRouter(prefix="/todos", tags=["todos"])`, importing `crud`, the
  schemas (`TodoCreate`, `TodoUpdate`, `TodoResponse`), and `get_db` from
  `app.database` — files: backend/app/routers/todos.py. Done: module imports with
  no error and exposes `router`.
- [x] 2.2 Implement `GET /todos` → 200 `list[TodoResponse]`, delegating to
  `crud.list_todos(db)` (newest-first ordering owned by crud) — files:
  backend/app/routers/todos.py. Done: endpoint returns the crud list unmodified.
- [x] 2.3 Implement `GET /todos/{id}` → 200 `TodoResponse`, calling
  `crud.get_todo(db, id)`; raise `HTTPException(404, "Todo not found")` when it
  returns `None` — files: backend/app/routers/todos.py. Done: 200 on hit, 404 on
  miss.
- [x] 2.4 Implement `POST /todos` with `status_code=201` → `TodoResponse`, calling
  `crud.create_todo(db, data)` where `data: TodoCreate` (422 handled automatically
  by schema validation) — files: backend/app/routers/todos.py. Done: 201 on valid
  body, 422 on invalid.
- [x] 2.5 Implement `PUT /todos/{id}` → 200 `TodoResponse`, calling
  `crud.update_todo(db, id, data)` where `data: TodoUpdate` (partial); raise
  `HTTPException(404, "Todo not found")` when it returns `None` — files:
  backend/app/routers/todos.py. Done: 200 partial-update, 404 on miss, 422 on
  invalid.
- [x] 2.6 Implement `DELETE /todos/{id}` with `status_code=204` and no
  `response_model`, calling `crud.delete_todo(db, id)`; return `None` on `True`,
  raise `HTTPException(404, "Todo not found")` on `False` — files:
  backend/app/routers/todos.py. Done: 204 empty body on hit, 404 on miss.
- [x] 2.7 Ensure every route uses `db: Session = Depends(get_db)` and contains no
  ORM queries, sorting, filtering, or session construction (thin-router rule) —
  files: backend/app/routers/todos.py. Done: manual review confirms each route
  calls exactly one `crud.*` function via the injected session.

## 3. Done condition & tests

- [x] 3.1 Create `backend/tests/test_todos_api.py` using FastAPI `TestClient`
  (httpx) with `get_db` overridden to a temp/in-memory SQLite session — files:
  backend/tests/test_todos_api.py. Done: fixtures build an app + isolated DB.
- [x] 3.2 Test all five endpoints and status codes: GET list (200, newest-first),
  GET by id (200 + 404), POST (201 + 422), PUT (200 partial + 404 + 422), DELETE
  (204 empty body + 404) — files: backend/tests/test_todos_api.py. Done: assertions
  cover each row of CONTRACTS.md §2.
- [x] 3.3 Overall done condition: all 5 endpoints pass their TestClient tests.
  Test command: `cd backend && pytest tests/test_todos_api.py`. Done: the command
  exits 0 with all tests passing.
