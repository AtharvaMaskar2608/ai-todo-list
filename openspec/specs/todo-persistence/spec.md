# todo-persistence Specification

## Purpose
TBD - created by archiving change cho-42-backend-core. Update Purpose after archive.
## Requirements
### Requirement: Todo data model
The system SHALL define a `Todo` SQLAlchemy model on the shared `Base` with these columns: `id` (Integer, primary key, autoincrement), `title` (String(100), NOT NULL), `description` (String(500), nullable), `completed` (Boolean, NOT NULL, default False), `created_at` (DateTime), and `updated_at` (DateTime).

#### Scenario: Model column constraints
- **WHEN** the `Todo` table is created and a row is inserted
- **THEN** `id` MUST be an auto-incrementing primary key, `title` MUST reject NULL, `description` MAY be NULL, and `completed` MUST default to `False` when unspecified

#### Scenario: Length bounds
- **WHEN** the model is declared
- **THEN** `title` MUST be typed `String(100)` and `description` MUST be typed `String(500)`

### Requirement: UTC timestamps
The system SHALL set `created_at` to the current UTC time when a Todo is created and SHALL update `updated_at` to the current UTC time on both creation and every subsequent update.

#### Scenario: Timestamps on create
- **WHEN** `create_todo` inserts a new Todo
- **THEN** `created_at` and `updated_at` MUST both be set to the current UTC datetime

#### Scenario: updated_at changes on update
- **WHEN** `update_todo` modifies an existing Todo
- **THEN** `updated_at` MUST be refreshed to the current UTC datetime while `created_at` remains unchanged

### Requirement: Pydantic schemas
The system SHALL provide Pydantic v2 schemas `TodoBase`, `TodoCreate`, `TodoUpdate`, and `TodoResponse` matching CONTRACTS.md §1. `TodoBase` has `title: str` (trimmed, 1..100, non-empty) and `description: str | None = None` (<= 500). `TodoCreate` extends `TodoBase`. `TodoUpdate` has all-optional `title`, `description`, `completed`. `TodoResponse` extends `TodoBase` with `id: int`, `completed: bool`, `created_at: datetime`, `updated_at: datetime`, and `model_config = ConfigDict(from_attributes=True)`.

#### Scenario: Create validation rejects empty title
- **WHEN** a `TodoCreate` is constructed with a blank or whitespace-only title
- **THEN** validation MUST fail (title must be non-empty after trimming, 1..100 chars)

#### Scenario: Create validation rejects over-long fields
- **WHEN** a `TodoCreate` has a title over 100 chars or a description over 500 chars
- **THEN** validation MUST fail

#### Scenario: Response serializes from ORM object
- **WHEN** a `TodoResponse` is built from a `Todo` ORM instance
- **THEN** `from_attributes` MUST allow direct construction and the response MUST include `id`, `title`, `description`, `completed`, `created_at`, and `updated_at`

#### Scenario: Update allows partial payloads
- **WHEN** a `TodoUpdate` is constructed with only a subset of fields
- **THEN** the omitted fields MUST be treated as unset (not overwritten) rather than defaulting to null

### Requirement: List ordering newest-first
The system SHALL provide `list_todos(db: Session) -> list[Todo]` returning all todos ordered by `created_at` descending (newest first).

#### Scenario: Newest todo appears first
- **WHEN** several todos exist with different `created_at` values and `list_todos` is called
- **THEN** the returned list MUST be ordered by `created_at` descending

### Requirement: Get single todo
The system SHALL provide `get_todo(db: Session, todo_id: int) -> Todo | None` returning the matching Todo or `None` if no row has that id.

#### Scenario: Missing id returns None
- **WHEN** `get_todo` is called with an id that does not exist
- **THEN** it MUST return `None`

### Requirement: Create todo
The system SHALL provide `create_todo(db: Session, data: TodoCreate) -> Todo` that persists a new Todo from the validated payload and returns the created row with its populated id and timestamps.

#### Scenario: Create returns persisted row
- **WHEN** `create_todo` is called with a valid `TodoCreate`
- **THEN** a new row MUST be committed and the returned Todo MUST have a non-null `id`, `created_at`, and `updated_at`, with `completed` defaulting to `False`

### Requirement: Partial update semantics
The system SHALL provide `update_todo(db: Session, todo_id: int, data: TodoUpdate) -> Todo | None` that applies only the fields present in `data`, returns the updated Todo, and returns `None` when the id is missing.

#### Scenario: Only provided fields change
- **WHEN** `update_todo` is called with a `TodoUpdate` that sets only `completed`
- **THEN** `completed` MUST change while `title` and `description` remain unchanged, and `updated_at` MUST be refreshed

#### Scenario: Update missing id returns None
- **WHEN** `update_todo` targets an id that does not exist
- **THEN** it MUST return `None` and make no changes

### Requirement: Delete todo
The system SHALL provide `delete_todo(db: Session, todo_id: int) -> bool` returning `True` if a row was deleted and `False` if the id was missing.

#### Scenario: Delete existing returns True
- **WHEN** `delete_todo` is called with an existing id
- **THEN** the row MUST be removed and the function MUST return `True`

#### Scenario: Delete missing returns False
- **WHEN** `delete_todo` is called with a non-existent id
- **THEN** no row is removed and the function MUST return `False`

### Requirement: Case-insensitive search
The system SHALL provide `search_todos(db: Session, query: str) -> list[Todo]` matching the query case-insensitively against `title` OR `description`, ordered newest-first.

#### Scenario: Case-insensitive match on title or description
- **WHEN** `search_todos` is called with a query that differs only in letter case from text in a todo's title or description
- **THEN** that todo MUST be included in the results, ordered by `created_at` descending

### Requirement: Delete completed returns count
The system SHALL provide `delete_completed(db: Session) -> int` that deletes every todo whose `completed` is `True` and returns the number of rows deleted.

#### Scenario: Returns number deleted
- **WHEN** three completed and two active todos exist and `delete_completed` is called
- **THEN** the three completed todos MUST be removed, the two active todos MUST remain, and the function MUST return `3`

#### Scenario: No completed todos returns zero
- **WHEN** no todo is completed and `delete_completed` is called
- **THEN** it MUST return `0` and delete nothing

