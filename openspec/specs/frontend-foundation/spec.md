# frontend-foundation Specification

## Purpose
TBD - created by archiving change cho-43-frontend-shell. Update Purpose after archive.
## Requirements
### Requirement: Mount-point IDs in index.html
The system SHALL provide `frontend/index.html` containing every mount-point id
from CONTRACTS.md §4 so that feature modules can query them and MUST NOT add or
edit these ids themselves.

#### Scenario: All required ids are present
- **WHEN** `index.html` is loaded and each id is looked up
- **THEN** the document MUST contain `#theme-toggle`, `#quote`, `#toast-container`, `#todo-form`, `#todo-title`, `#todo-desc`, `#search-input`, `#filter-all`, `#filter-active`, `#filter-completed`, `#stat-all`, `#stat-active`, `#stat-completed`, `#progress-bar`, `#progress-label`, `#todo-list`, `#empty-state`, `#edit-modal`, `#delete-modal`, `#ai-panel`, `#ai-toggle`, `#ai-messages`, `#ai-input`, and `#ai-send`

### Requirement: API client is the sole network layer
The system SHALL expose `api` from `frontend/js/api.js` as the only module that
performs network requests, with methods `listTodos()`, `getTodo(id)`,
`createTodo({title, description})`, `updateTodo(id, patch)`, `deleteTodo(id)`,
and `chat(messages)` targeting `API_BASE_URL`, and it MUST throw
`ApiError(status, detail)` on any non-2xx response.

#### Scenario: Successful request returns parsed data
- **WHEN** `api.listTodos()` is called and the backend responds 200 with a JSON array
- **THEN** it MUST resolve to the parsed `Todo[]` without throwing

#### Scenario: Non-2xx response throws ApiError
- **WHEN** any `api` method receives a non-2xx response (for example 404 with `{"detail": "Todo not found"}`)
- **THEN** it MUST throw an `ApiError` carrying the HTTP `status` and the `detail` message so the caller can show a toast

### Requirement: Reactive store with pub/sub sync
The system SHALL expose `store` from `frontend/js/store.js` with `getTodos()`,
`async refresh()`, `setTodos(list)`, `subscribe(fn)`, `filter`, `search`,
`setFilter(f)`, and `setSearch(q)`, and every state mutation MUST notify all
current subscribers.

#### Scenario: Subscriber notified on mutation
- **WHEN** a subscriber is registered via `store.subscribe(fn)` and `store.setTodos(list)`, `store.setFilter(f)`, or `store.setSearch(q)` is then called
- **THEN** `fn` MUST be invoked with the current todos, and `store.subscribe` MUST have returned an unsubscribe function that stops further notifications when called

#### Scenario: Refresh re-fetches then notifies
- **WHEN** `store.refresh()` is awaited
- **THEN** it MUST re-fetch via `api.listTodos()`, replace the stored todos, and notify all subscribers so the todo list re-renders

### Requirement: Toast notifications auto-dismiss
The system SHALL expose `showToast(message, type)` from `frontend/js/ui/toast.js`
(type one of `success`, `error`, `info`) that renders a toast into
`#toast-container` and MUST automatically remove it after 3 seconds.

#### Scenario: Toast disappears after three seconds
- **WHEN** `showToast("Task Added", "success")` is called
- **THEN** the toast MUST appear in `#toast-container` and MUST be removed automatically after 3 seconds

### Requirement: Modal primitive with backdrop and Escape close
The system SHALL expose `openModal(el)` and `closeModal(el)` from
`frontend/js/ui/modal.js` that show and hide a modal with a dark blurred
backdrop and trap focus, and an open modal MUST close when the Escape key is
pressed.

#### Scenario: Escape closes the open modal
- **WHEN** a modal is opened via `openModal(el)` and the user presses the Escape key
- **THEN** the modal MUST close (as if `closeModal(el)` were called) and the backdrop MUST be removed

### Requirement: Skeleton loading state without a spinner
The system SHALL expose `showSkeletons(container, n)` and
`clearSkeletons(container)` from `frontend/js/ui/skeleton.js`, and the loading
state MUST render animated placeholder cards (default 3) and MUST NOT use a
spinner.

#### Scenario: Three skeleton cards render while loading
- **WHEN** `showSkeletons(container, 3)` is called during an initial load
- **THEN** the container MUST show three animated skeleton cards and no spinner, and `clearSkeletons(container)` MUST remove them

### Requirement: Dark mode persists across reloads
The system SHALL provide `initTheme()` in `frontend/js/features/theme.js` that
toggles the `dark` class on the document root via `#theme-toggle` and persists
the preference in localStorage so it MUST be restored on the next page load.

#### Scenario: Preference restored after reload
- **WHEN** the user enables dark mode via `#theme-toggle` and then reloads the page
- **THEN** the persisted preference MUST be read from localStorage and dark mode MUST be re-applied before content is shown

### Requirement: Random motivational quote on load
The system SHALL provide `initQuote()` in `frontend/js/features/quote.js` that
selects one random motivational quote and renders it into `#quote` on each page
load.

#### Scenario: A quote is shown on load
- **WHEN** the page loads and `initQuote()` runs
- **THEN** exactly one randomly selected quote MUST be rendered into `#quote`

### Requirement: Responsive centered layout
The system SHALL lay out `index.html` as a horizontally centered container
constrained to `max-width: 900px` that adapts across desktop (≥1024px), tablet
(768–1023px), and mobile (<768px) breakpoints so content stacks and controls
remain usable on small screens.

#### Scenario: Layout adapts to mobile width
- **WHEN** the viewport is narrower than 768px
- **THEN** the layout MUST collapse to a single stacked column with touch-friendly, full-width controls, and the page MUST NOT scroll horizontally

### Requirement: Bootstrap initializes features when present
The system SHALL provide `frontend/js/main.js` that runs `initTheme()` and
`initQuote()` on load, then dynamically imports `features/todos/index.js#initTodos`
and `features/chat/index.js#initChat` under a guard so a missing feature module
is skipped without error and the shell still renders.

#### Scenario: Shell runs standalone without feature modules
- **WHEN** `main.js` boots and the `features/todos` or `features/chat` module does not yet exist
- **THEN** the shell MUST still render with a working theme toggle, quote, and chrome, and MUST NOT throw an uncaught error for the missing module

#### Scenario: Present feature is initialized
- **WHEN** a feature module (for example `features/todos/index.js`) is present at boot
- **THEN** `main.js` MUST import it and call its initializer (`initTodos()`) so the feature activates

