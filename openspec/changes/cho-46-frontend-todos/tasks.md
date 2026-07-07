# Tasks: frontend-todos

All files live under `frontend/js/features/todos/`. This change never edits
`index.html` or any shell module; it imports `api`, `store`, and `ui/*` from the
shell and queries the §4 mount IDs.

**Done condition & tests (whole change):** with the backend (`/todos` CRUD) and
`frontend-shell` running, create / edit / delete / toggle / search / filter all
work and the list re-renders on any `store` change (including AI-driven
`store.refresh()`). Verify end-to-end in a browser via the `/browse` skill.

## 1. Feature entry & reactive wiring

- [x] 1.1 Create `initTodos()` that queries mount IDs, subscribes to `store`,
  and runs the initial `store.refresh()` — files: frontend/js/features/todos/index.js
  Contract: `export function initTodos(): void`. Done: on load, skeletons show
  then real cards render; every `store` change repaints `#todo-list`, stats,
  progress, and empty state.

## 2. Rendering

- [x] 2.1 Build card renderer (checkbox, title, description, created date,
  edit/delete buttons, completed styling, hover lift) and list painter that
  applies `store.filter` + `store.search` — files: frontend/js/features/todos/render.js
  Contract: `renderList(container, todos, view)`, `renderCard(todo): HTMLElement`.
  Done: active and completed cards render per spec; hover lifts the card.

## 3. Create form

- [x] 3.1 Wire the create form: trim + require title, disable submit while in
  flight, call `api.createTodo`, then clear inputs, `showToast`, `store.refresh()`,
  animate new card; submit on Enter — files: frontend/js/features/todos/form.js
  Contract: `initForm(): void` using `#todo-form`/`#todo-title`/`#todo-desc`.
  Done: valid submit adds a card + toast; empty/whitespace title is rejected.

## 4. Completion toggle

- [x] 4.1 Toggle completion from the card checkbox via
  `api.updateTodo(id, { completed })` then `store.refresh()`; error toast on
  `ApiError` — files: frontend/js/features/todos/render.js
  Contract: checkbox change handler on each `renderCard`. Done: clicking the
  checkbox flips completed state and re-renders; failure shows a toast and
  reverts on next render.

## 5. Edit modal

- [x] 5.1 Open `#edit-modal` via `ui/modal` prefilled with the todo; Save calls
  `api.updateTodo(id, patch)` then closes, toasts, and `store.refresh()`; Cancel
  closes with no change — files: frontend/js/features/todos/edit.js
  Contract: `openEdit(todo): void`. Done: editing a title and saving updates the
  card; Cancel makes no request.

## 6. Delete confirmation

- [x] 6.1 Open `#delete-modal` via `ui/modal`; Confirm animates the card out,
  then `api.deleteTodo(id)`, toast, `store.refresh()`; Cancel closes — files:
  frontend/js/features/todos/delete.js
  Contract: `openDelete(todo): void`. Done: confirming removes the card with an
  animate-out; Cancel leaves it.

## 7. Search & filters

- [x] 7.1 Wire live search (`#search-input` -> `store.setSearch`) and All/
  Active/Completed pills (`store.setFilter`), reflecting active/inactive pill
  styling — files: frontend/js/features/todos/filters.js
  Contract: `initFilters(): void`. Done: typing filters the list live (title OR
  description, case-insensitive); pills switch the visible set and combine with
  search.

## 8. Stats, progress & confetti

- [x] 8.1 Render stat counts (`#stat-all/-active/-completed`) with change
  animation, animated progress bar (`#progress-bar`/`#progress-label`), and
  one-shot confetti when a non-empty list is fully complete (re-arm when a task
  becomes active) — files: frontend/js/features/todos/stats.js
  Contract: `renderStats(todos): void`. Done: counts + progress update on every
  change; confetti fires once at 100% and re-arms after a task becomes active.

## 9. Empty state

- [x] 9.1 Show/hide `#empty-state` with icon, message, and call-to-action when
  no todos are visible (zero todos or none matching filter+search) — files:
  frontend/js/features/todos/empty.js
  Contract: `renderEmpty(container, view): void`. Done: empty list and
  no-match-filter both show the empty state and hide the list.

## 10. End-to-end verification

- [x] 10.1 With backend + shell running, run through create / toggle / edit /
  delete / search / filter and confirm the list re-renders on `store` changes;
  verify via the `/browse` skill — files: frontend/js/features/todos/index.js
  Done: all flows pass in the browser with no console errors; AI-driven
  `store.refresh()` also repaints the list.
