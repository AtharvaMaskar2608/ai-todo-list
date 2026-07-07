# Design: backend-todos-api

## Context

`backend-core` owns the persistence and business layer: the `Todo` SQLAlchemy
model, the Pydantic schemas, the `crud.*` functions (Session-first, synchronous),
and the FastAPI app skeleton (`create_app()`, CORS, table creation, `/health`).
Per CONTRACTS.md §1, `main.py` already wires in `routers.todos` and `routers.agent`
via guarded imports, so router changes only CREATE their router file and never edit
`main.py` — avoiding write-conflicts during parallel fan-out.

This change implements CONTRACTS.md §2: the `/todos` REST surface. The router is a
thin HTTP adapter. It binds request bodies to the frozen schemas, injects a DB
session with `Depends(get_db)`, calls the matching `crud.*` function, and maps the
result to an HTTP status code. No querying, ordering, filtering, or field-level
validation lives here.

## Goals / Non-Goals

Goals:
- Expose the five CRUD endpoints exactly as specified in CONTRACTS.md §2.
- Keep routes thin: delegate 100% of behavior to `crud.*`.
- Return correct status codes: 200, 201, 204, 404, 422.
- Use dependency injection for the DB session (`Depends(get_db)`).
- Ship httpx/TestClient tests proving all five endpoints and their codes.

Non-Goals:
- No editing of `main.py`, `crud.py`, `schemas.py`, `models.py`, `database.py`,
  or `requirements.txt` (owned by `backend-core`).
- No search endpoint or `delete_completed` endpoint over HTTP — the UI does live
  search client-side (CONTRACTS.md §4) and those `crud.*` functions are consumed
  only by the agent (§3). Not in the REST contract, so out of scope here.
- No auth, pagination, or business rules in the router.

## Decisions

- **Thin routers / no business logic.** Every route body is: bind schema, get
  session, call one `crud.*` function, translate the result to a response or
  `HTTPException`. Ordering (newest-first) and partial-update semantics are the
  responsibility of `crud.*`, not the route. This keeps the contract single-sourced
  and the routes trivially testable.
- **Status codes.**
  - `GET /todos` → 200 with `list[TodoResponse]` (order comes from `crud.list_todos`,
    which returns `created_at DESC`).
  - `GET /todos/{id}` → 200 `TodoResponse`, or 404 when `crud.get_todo` returns `None`.
  - `POST /todos` → 201 `TodoResponse` (declared via `status_code=201`); 422 when the
    body fails `TodoCreate` validation (FastAPI/Pydantic default, automatic).
  - `PUT /todos/{id}` → 200 `TodoResponse`, or 404 when `crud.update_todo` returns
    `None`; 422 on invalid `TodoUpdate` body (automatic).
  - `DELETE /todos/{id}` → 204 with no body when `crud.delete_todo` returns `True`;
    404 when it returns `False`.
- **DELETE returns 204 with no body.** The route is declared with
  `status_code=204` and returns `None` (FastAPI emits an empty body). It must not
  return a JSON payload or set a `response_model`.
- **PUT is a partial update.** The route passes the raw `TodoUpdate` (all fields
  optional) straight to `crud.update_todo`; `crud` applies only the provided fields.
  The route does not compute diffs or default missing fields.
- **404 error shape.** Raise `HTTPException(status_code=404, detail="Todo not
  found")` to match CONTRACTS.md §1's error contract exactly.
- **Dependency injection.** The session is provided by `db: Session =
  Depends(get_db)` imported from `app.database`; the router never constructs a
  session itself. This makes tests able to override `get_db` with a test session.
- **Router shape.** `APIRouter(prefix="/todos", tags=["todos"])`, exported as
  `router` so `main.py`'s guarded `app.include_router(routers.todos.router)` picks
  it up. `response_model=TodoResponse` (or `list[TodoResponse]`) is set per route
  for serialization; DELETE sets no `response_model`.

## Risks / Trade-offs

- **Risk:** `crud.*` signatures drift from CONTRACTS.md §1 (e.g. `update_todo`
  raises instead of returning `None`, or `delete_todo` returns the object instead
  of a bool). → **Mitigation:** Code strictly to the frozen §1 signatures
  (`get_todo`/`update_todo` return `Model | None`; `delete_todo` returns `bool`);
  the TestClient suite exercises the 404 paths, so a signature mismatch fails a
  test rather than silently 500-ing.
- **Risk:** This change lands before `backend-core`, breaking imports. →
  **Mitigation:** Declared dependency on `backend-core` (proposal Impact); per the
  parallel workflow rules the contract must be on `main` before fan-out.
  `main.py`'s guarded import keeps the app bootable even if a router is missing.
- **Risk:** Editing `main.py` to include the router would collide with
  `backend-agent` doing the same. → **Mitigation:** Per CONTRACTS.md §1, `main.py`
  includes both routers up front via guarded import; this change creates only the
  router file and never touches `main.py`.
- **Risk:** DELETE accidentally serializes a body, violating 204. →
  **Mitigation:** `status_code=204`, no `response_model`, route returns `None`;
  a test asserts an empty response body.
