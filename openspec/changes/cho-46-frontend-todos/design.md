# Design: frontend-todos

## Context

`frontend-shell` (contract §4) owns `index.html`, `config.js`, `api.js`,
`store.js`, the `ui/*` primitives, theme/quote features, and CSS. It bootstraps
features via a guarded dynamic import in `main.js`. This change (contract §5)
owns exactly `frontend/js/features/todos/` and consumes the shell contract as a
black box. A sibling change, `frontend-ai-chat`, owns `features/chat/` and also
mutates through `api` + `store`. The two features never share files; their only
coupling is the shared `store`, which is the single source of truth for the
todo list and view state (`filter`, `search`).

Source requirements: `docs/project_context.md` §§10–22, 24, 25.

## Goals / Non-Goals

Goals:
- A complete, reactive todo UI: render, create, toggle, edit, delete, search,
  filter, stats, progress, empty state, confetti, keyboard.
- Zero writes outside `features/todos/`; every network call and every DOM mount
  point comes from the shell contract.
- Deterministic re-render: the DOM is a pure function of `store` state.

Non-Goals:
- No network code (lives in `api.js`), no state container (lives in `store.js`),
  no modal/toast/skeleton internals (live in `ui/*`), no `index.html` edits.
- No AI chat behavior (owned by `frontend-ai-chat`).
- No dark-mode toggle or quote (owned by shell).

## Decisions

### Module split under `features/todos/`
One file per concern so the feature stays reviewable and merge-conflict-free
against the chat feature (different directory entirely):
- `index.js` — `initTodos()`: wires DOM, subscribes to `store`, runs the initial
  `store.refresh()`. Contract: `export function initTodos(): void`.
- `render.js` — `renderList(container, todos, view)` and `renderCard(todo)`
  build task cards. Pure DOM builders, no fetching.
- `form.js` — `initForm(onCreate)`; validates + submits the create form.
- `edit.js` — `openEdit(todo)`; populates and manages `#edit-modal`.
- `delete.js` — `openDelete(todo)`; manages `#delete-modal` and animate-out.
- `filters.js` — `initFilters()`; wires search input + filter pills to `store`.
- `stats.js` — `renderStats(todos)`; stat cards, progress bar, confetti trigger.
- `empty.js` — `renderEmpty(container, view)`; empty-state block + CTA.

### Render driven by store subscription
`initTodos()` calls `store.subscribe(todos => rerender())`. On every store
change (`refresh`, `setTodos`, `setFilter`, `setSearch`) the feature recomputes
the visible list from `store.getTodos()`, `store.filter`, and `store.search`,
then repaints `#todo-list`, stats, progress, and empty state. There is no local
copy of the todo array — the store is authoritative, so AI-driven changes that
call `store.refresh()` repaint this UI for free.

### Client-side live search + filter over the loaded list
Search and filter are pure view operations, never network calls. `filters.js`
writes to `store.setSearch(q)` / `store.setFilter(f)`; the render step filters
`store.getTodos()` by `completed` (Active/Completed) and by case-insensitive
substring match on title OR description. This matches the contract note that
"Live text search is client-side over the loaded list; no search endpoint used
by UI."

### Mutate via `api` then `store.refresh()`
Create/toggle/edit/delete each call the relevant `api.*` method, and on success
call `store.refresh()` so the list re-fetches and re-renders from the server —
one code path, no optimistic local mutation to keep in sync. On an `ApiError`
the feature calls `showToast(detail, "error")` and leaves state untouched.

### Confetti only once until a task becomes active again
`stats.js` keeps a module-level `celebrated` flag. Confetti fires when there is
at least one task AND all tasks are completed AND `celebrated` is false; then
`celebrated` is set true. When any task becomes active (an incomplete task
exists) `celebrated` resets to false, arming the next celebration. Empty list
never celebrates.

### Edit and delete reuse `ui/modal`
`edit.js` and `delete.js` call `openModal(#edit-modal)` / `openModal(#delete-modal)`
and `closeModal(...)`. They rely on the shell modal for backdrop, focus trap,
and Escape-to-close; they only populate fields and wire the Save/Cancel/Delete
buttons. Delete adds an animate-out class to the card, waits for the transition,
then calls `api.deleteTodo` + `store.refresh()`.

### Keyboard: Enter = submit, Escape = close
The create form submits on Enter via native `<form>` submit (title field). Modal
Escape-to-close is provided by `ui/modal`; the feature adds nothing that would
conflict with it.

## Risks / Trade-offs

- Risk: Full re-render of `#todo-list` on every store change could feel janky.
  Mitigation: cards are lightweight; entry/exit CSS transitions run on class
  toggles, and only `#todo-list` innerHTML is rebuilt, not the whole page.
- Risk: `store.refresh()` after each mutation adds a round-trip vs. optimistic
  update. Mitigation: keeps a single authoritative state path and guarantees
  consistency with AI-driven changes; acceptable for a local/single-user app.
- Risk: Relying on shell mount IDs and `store`/`api`/`ui` shapes that are frozen
  in §4 but not yet on `main`. Mitigation: the shell contract must land first
  (per CLAUDE.md fan-out rule); `main.js` uses a guarded import so a missing
  feature never breaks the shell, and vice versa.
- Risk: `celebrated` flag lives in module scope and resets on reload.
  Mitigation: intended behavior — confetti is a per-session delight, not
  persisted state.
- Risk: Overlap with `frontend-ai-chat` on shared `store`. Mitigation: both only
  call documented `store` methods; no file overlap, so no merge conflict.
