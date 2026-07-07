# Change: frontend-todos

## Why

The Todo app needs its primary interactive surface: the task list where users
create, view, edit, complete, delete, search, and filter todos, backed by live
statistics, a progress bar, an empty state, and celebratory confetti. The
`frontend-shell` change provides the page chrome, the network layer (`api`),
the reactive state store (`store`), and shared UI primitives (`ui/modal`,
`ui/toast`, `ui/skeleton`) plus all mount-point IDs in `index.html`, but ships
no todo behavior of its own. This change delivers that behavior as a
self-contained feature module so it can be built in parallel with the AI chat
feature without touching shared files.

## What Changes

- Add the `frontend/js/features/todos/` module: `index.js` (`initTodos`),
  `render.js`, `form.js`, `edit.js`, `delete.js`, `filters.js`, `stats.js`,
  `empty.js`.
- `initTodos()` subscribes to `store` and performs the initial `store.refresh()`.
- Render task cards with checkbox, title, description, created date, edit/delete
  actions, completed styling, and hover lift.
- Create tasks via a validated form; toggle completion via the card checkbox;
  edit and delete through `ui/modal`; all mutations go through `api` then
  `store.refresh()`.
- Client-side live search and All/Active/Completed filter pills over the loaded
  list via `store.setSearch` / `store.setFilter`.
- Live stats cards, animated progress bar, empty-state call-to-action, and a
  one-shot confetti celebration when every task is complete.
- Keyboard support: Enter submits the create form; Escape closes modals.

## Capabilities

### New Capabilities
- `todo-ui`: The browser-side todo management experience — card rendering,
  create form, completion toggle, edit/delete modals, live search + filters,
  stats + progress, empty state, confetti, and keyboard interactions, driven
  reactively by the shared `store`.

### Modified Capabilities
- None.

## Impact

- Depends on the `frontend-shell` §4 contract, which MUST land on `main` first:
  - `api`: `listTodos`, `createTodo`, `updateTodo(id, patch)`, `deleteTodo(id)`
    (throws `ApiError(status, detail)` on non-2xx).
  - `store`: `getTodos`, `refresh`, `subscribe(fn)`, `filter`, `search`,
    `setFilter`, `setSearch`.
  - `ui/modal`: `openModal(el)`, `closeModal(el)`; `ui/toast`: `showToast(msg,
    type)`; `ui/skeleton`: `showSkeletons(container, n)` / `clearSkeletons`.
  - `index.html` mount IDs: `#todo-form`, `#todo-title`, `#todo-desc`,
    `#search-input`, `#filter-all/-active/-completed`,
    `#stat-all/-active/-completed`, `#progress-bar`, `#progress-label`,
    `#todo-list`, `#empty-state`, `#edit-modal`, `#delete-modal`.
  - `frontend/js/main.js` guarded dynamic import of
    `features/todos/index.js#initTodos`.
- Owns ONLY files under `frontend/js/features/todos/`. Never edits `index.html`
  or any shell module. No conflict with `frontend-ai-chat`
  (`features/chat/`) — both consume the same `store` and shell contract.
