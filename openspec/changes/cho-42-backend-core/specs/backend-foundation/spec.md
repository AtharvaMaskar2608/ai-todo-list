## ADDED Requirements

### Requirement: Application factory
The system SHALL expose a `create_app()` factory in backend/app/main.py that builds and returns a configured FastAPI application instance.

#### Scenario: Factory returns an app
- **WHEN** `create_app()` is called
- **THEN** it MUST return a FastAPI instance with CORS configured, `/health` registered, and available routers included

### Requirement: Settings and configuration
The system SHALL provide a pydantic-settings `Settings` class exposed via `get_settings()` with `DATABASE_URL` (default `sqlite:///./todo.db`), `CORS_ORIGINS` (list), `ANTHROPIC_API_KEY` (from environment), and `ANTHROPIC_MODEL` defaulting to `"claude-sonnet-4-6"`.

#### Scenario: Model id constant
- **WHEN** `get_settings()` is read
- **THEN** `ANTHROPIC_MODEL` MUST equal `"claude-sonnet-4-6"` unless overridden by environment

#### Scenario: Secrets sourced from environment
- **WHEN** `ANTHROPIC_API_KEY` is set in the environment
- **THEN** `Settings` MUST read it from the environment and MUST NOT hardcode the value in source

### Requirement: CORS enabled for frontend origin
The system SHALL configure CORS middleware from `settings.CORS_ORIGINS` so the frontend can call the API cross-origin.

#### Scenario: Preflight allowed from configured origin
- **WHEN** a browser request arrives from an origin listed in `CORS_ORIGINS`
- **THEN** the response MUST include the appropriate `Access-Control-Allow-Origin` header

### Requirement: Health endpoint
The system SHALL expose `GET /health` returning HTTP 200 with body `{"status": "ok"}`.

#### Scenario: Health returns ok
- **WHEN** a client sends `GET /health`
- **THEN** the response MUST be 200 with JSON `{"status": "ok"}`

### Requirement: Database session dependency
The system SHALL provide `get_db()` in backend/app/database.py as a generator dependency that yields a `SessionLocal` session and closes it after the request, alongside exported `engine`, `SessionLocal`, and `Base`.

#### Scenario: Session opened and closed per request
- **WHEN** a request depends on `get_db()`
- **THEN** a session MUST be yielded for the handler and MUST be closed when the request completes, even on error

### Requirement: Table bootstrap on startup
The system SHALL create all `Base` metadata tables (via `Base.metadata.create_all(engine)`) when the application starts so the SQLite schema exists before the first request.

#### Scenario: Tables exist after boot
- **WHEN** the application starts against an empty database
- **THEN** the `todos` table MUST be created before any request is served

### Requirement: Conflict-free router inclusion
The system SHALL include `routers.todos` and `routers.agent` from within `create_app()` using guarded imports so that a router module that does not yet exist is skipped without error, and so router changes only CREATE their module without editing main.py.

#### Scenario: Missing router module is skipped
- **WHEN** `create_app()` runs and `routers.agent` does not yet exist as a module
- **THEN** the app MUST still build successfully with the available routers and MUST NOT raise for the missing module

#### Scenario: Present router module is included
- **WHEN** a router module (e.g. `routers.todos`) exists
- **THEN** `create_app()` MUST include its router so its routes are served
