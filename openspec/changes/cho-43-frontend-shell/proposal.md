# Proposal: frontend-shell

## Why

The Todo app's browser UI needs a single, authoritative foundation — the page
chrome, the network layer, the reactive state store, and the shared UI
primitives — that every feature builds on. Landing it first fixes the frontend
contract (CONTRACTS.md §4) so the two feature changes (`frontend-todos`,
`frontend-ai-chat`) can fan out in parallel without ever editing `index.html`
or the shell modules. Splitting into ES6 modules (instead of a single
`script.js`) is what makes that parallel, conflict-free work possible.

## What Changes

- Add `frontend/index.html`: Tailwind via CDN with a `tailwind.config` object
  (dark mode `class` strategy), Inter (Google Fonts), inline Heroicons, a
  responsive centered `max-w-[900px]` layout skeleton, ALL mount-point IDs from
  CONTRACTS.md §4, and a single `<script type="module" src="js/main.js">`.
- Add `frontend/js/config.js` exporting `API_BASE_URL = "http://localhost:8000"`.
- Add `frontend/js/api.js` — the ONLY networking module — exporting `api`
  (`listTodos`, `getTodo`, `createTodo`, `updateTodo`, `deleteTodo`, `chat`) and
  an `ApiError(status, detail)` thrown on any non-2xx response.
- Add `frontend/js/store.js` — the state + pub/sub sync backbone: `getTodos`,
  `refresh`, `setTodos`, `subscribe`, `filter`/`search` view state, `setFilter`,
  `setSearch`, and a private `notify()` that calls every subscriber.
- Add shared UI primitives: `js/ui/toast.js` (`showToast`, auto-dismiss 3s),
  `js/ui/modal.js` (`openModal`/`closeModal` with backdrop, Escape, focus trap),
  `js/ui/skeleton.js` (`showSkeletons`/`clearSkeletons`, 3 cards, no spinner).
- Add shell features: `js/features/theme.js` (`initTheme` — dark mode toggle +
  localStorage persist) and `js/features/quote.js` (`initQuote` — random quote
  on load).
- Add `js/main.js` bootstrap: calls `initTheme()` + `initQuote()`, then
  GUARDED dynamic-imports `features/todos/index.js#initTodos` and
  `features/chat/index.js#initChat` if present, so the shell runs standalone.
- Add `frontend/css/style.css` and the `frontend/assets/` directory.

## Capabilities

### New Capabilities
- `frontend-foundation`: The browser-side shell — `index.html` with all
  mount-point IDs, the sole network client (`api` + `ApiError`), the reactive
  pub/sub `store` that keeps the todo list and AI chat in sync, the shared toast
  / modal / skeleton UI primitives, dark-mode theming with persistence, the
  random motivational quote, and the bootstrap that initializes feature modules
  when they are present.

### Modified Capabilities
None — this is the first frontend change; no existing OpenSpec specs exist yet
to modify.

## Impact

- New files: `frontend/index.html`, `frontend/css/style.css`,
  `frontend/assets/`, `frontend/js/{config.js,api.js,store.js,main.js}`,
  `frontend/js/ui/{toast.js,modal.js,skeleton.js}`,
  `frontend/js/features/{theme.js,quote.js}`.
- This is the shared frontend contract (CONTRACTS.md §4). It MUST land on `main`
  before `frontend-todos` and `frontend-ai-chat` fan out. Those changes NEVER
  edit `index.html` or any shell module; they only add files under
  `frontend/js/features/todos/` and `frontend/js/features/chat/`.
- **`index.html` mount IDs owned by this change** (features query, never create):
  - Chrome: `#theme-toggle`, `#quote`, `#toast-container`.
  - Todos: `#todo-form`, `#todo-title`, `#todo-desc`, `#search-input`,
    `#filter-all`, `#filter-active`, `#filter-completed`, `#stat-all`,
    `#stat-active`, `#stat-completed`, `#progress-bar`, `#progress-label`,
    `#todo-list`, `#empty-state`, `#edit-modal`, `#delete-modal`.
  - AI: `#ai-panel`, `#ai-toggle`, `#ai-messages`, `#ai-input`, `#ai-send`.
- **`api` surface (sole network layer):** `listTodos()` → `Todo[]`,
  `getTodo(id)`, `createTodo({title, description})`, `updateTodo(id, patch)`,
  `deleteTodo(id)` → void, `chat(messages)` → `{reply, tool_activity,
  todos_changed}`; throws `ApiError(status, detail)` on non-2xx.
- **`store` surface (sync backbone):** `getTodos()`, `async refresh()`,
  `setTodos(list)`, `subscribe(fn) → unsubscribe`, `filter`, `search`,
  `setFilter(f)`, `setSearch(q)`; every mutation calls `notify()`. AI chat calls
  `store.refresh()` when `todos_changed`, so the todo list re-renders via its
  subscription.
