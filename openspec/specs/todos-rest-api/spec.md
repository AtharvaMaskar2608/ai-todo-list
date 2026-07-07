# todos-rest-api Specification

## Purpose
TBD - created by archiving change cho-44-backend-todos-api. Update Purpose after archive.
## Requirements
### Requirement: List todos

The system SHALL expose `GET /todos` returning HTTP 200 with a JSON array of
`TodoResponse` objects. The list MUST be ordered newest-first (by `created_at`
descending), as provided by `crud.list_todos`. The route MUST NOT sort or filter;
it returns exactly what `crud.list_todos(db)` yields.

#### Scenario: Returns todos newest-first

- **WHEN** a client sends `GET /todos` and three todos exist
- **THEN** the response is HTTP 200 with a JSON array of three `TodoResponse`
  objects ordered by `created_at` descending (most recently created first)

#### Scenario: Returns empty array when no todos exist

- **WHEN** a client sends `GET /todos` and no todos exist
- **THEN** the response is HTTP 200 with an empty JSON array `[]`

### Requirement: Get a todo by id

The system SHALL expose `GET /todos/{id}` returning HTTP 200 with the matching
`TodoResponse`. If `crud.get_todo(db, id)` returns `None`, the route MUST respond
HTTP 404 with body `{"detail": "Todo not found"}`.

#### Scenario: Returns the todo when it exists

- **WHEN** a client sends `GET /todos/{id}` for an existing todo id
- **THEN** the response is HTTP 200 with the matching `TodoResponse`

#### Scenario: Returns 404 when the todo is missing

- **WHEN** a client sends `GET /todos/{id}` for an id that does not exist
- **THEN** the response is HTTP 404 with body `{"detail": "Todo not found"}`

### Requirement: Create a todo

The system SHALL expose `POST /todos` accepting a `TodoCreate` body and returning
HTTP 201 with the created `TodoResponse`. The route MUST delegate creation to
`crud.create_todo(db, data)`. Invalid bodies (missing/empty title, title > 100
chars, description > 500 chars) MUST be rejected with HTTP 422 via schema
validation before any `crud` call.

#### Scenario: Creates a todo and returns 201

- **WHEN** a client sends `POST /todos` with a valid `TodoCreate` body
- **THEN** the response is HTTP 201 with the created `TodoResponse` including its
  generated `id`, `completed=false`, and `created_at`/`updated_at` timestamps

#### Scenario: Rejects an invalid body with 422

- **WHEN** a client sends `POST /todos` with an invalid body (e.g. missing or
  empty `title`)
- **THEN** the response is HTTP 422 and no todo is created

### Requirement: Update a todo (partial)

The system SHALL expose `PUT /todos/{id}` accepting a `TodoUpdate` body (all
fields optional) and returning HTTP 200 with the updated `TodoResponse`. The route
MUST delegate to `crud.update_todo(db, id, data)` and apply partial-update
semantics (only provided fields change). If `crud.update_todo` returns `None`, the
route MUST respond HTTP 404 with body `{"detail": "Todo not found"}`. Invalid
bodies MUST be rejected with HTTP 422.

#### Scenario: Applies a partial update and returns 200

- **WHEN** a client sends `PUT /todos/{id}` for an existing todo with a body
  setting only `completed=true`
- **THEN** the response is HTTP 200 with the updated `TodoResponse` where
  `completed` is `true` and the other fields are unchanged

#### Scenario: Returns 404 when updating a missing todo

- **WHEN** a client sends `PUT /todos/{id}` for an id that does not exist
- **THEN** the response is HTTP 404 with body `{"detail": "Todo not found"}`

#### Scenario: Rejects an invalid update body with 422

- **WHEN** a client sends `PUT /todos/{id}` with an invalid body (e.g. `title`
  longer than 100 characters)
- **THEN** the response is HTTP 422 and the todo is not modified

### Requirement: Delete a todo

The system SHALL expose `DELETE /todos/{id}` returning HTTP 204 with no response
body when `crud.delete_todo(db, id)` returns `True`. If `crud.delete_todo` returns
`False`, the route MUST respond HTTP 404 with body `{"detail": "Todo not found"}`.
The 204 response MUST NOT include a body or a `response_model`.

#### Scenario: Deletes an existing todo and returns 204

- **WHEN** a client sends `DELETE /todos/{id}` for an existing todo
- **THEN** the response is HTTP 204 with an empty body and the todo no longer
  exists

#### Scenario: Returns 404 when deleting a missing todo

- **WHEN** a client sends `DELETE /todos/{id}` for an id that does not exist
- **THEN** the response is HTTP 404 with body `{"detail": "Todo not found"}`

### Requirement: Routes contain no business logic

The `/todos` routes MUST contain no business logic. Each route SHALL obtain its DB
session via `Depends(get_db)`, delegate to exactly one `crud.*` function
(`list_todos`, `get_todo`, `create_todo`, `update_todo`, `delete_todo`), and
translate the result into an HTTP status code. Routes MUST NOT run ORM queries,
perform ordering/filtering/searching, or apply validation beyond Pydantic schema
binding. The router MUST NOT construct its own DB session or edit `main.py`.

#### Scenario: Every route delegates to crud via injected session

- **WHEN** the `backend/app/routers/todos.py` module is reviewed
- **THEN** each route uses `db: Session = Depends(get_db)` and calls a single
  `crud.*` function, with no direct ORM query, sorting, filtering, or session
  construction in the route body

#### Scenario: Ordering is owned by crud, not the route

- **WHEN** `GET /todos` returns newest-first results
- **THEN** the ordering originates from `crud.list_todos` (`created_at DESC`) and
  the route performs no sorting of its own

