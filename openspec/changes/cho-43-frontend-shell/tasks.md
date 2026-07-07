# Tasks: frontend-shell

This is the CONTRACT-OWNING frontend change (CONTRACTS.md §4). It creates the
shell — `index.html`, `api`, `store`, UI primitives, theme, quote, and the
bootstrap — and MUST land on `main` before `frontend-todos` and
`frontend-ai-chat` fan out. Those changes NEVER edit `index.html` or any shell
module; they only add files under `frontend/js/features/{todos,chat}/`.

Overall done condition (whole change): serve `frontend/` via a static server
(`cd frontend && python -m http.server 5500`), open `http://localhost:5500` —
the page renders with the theme toggle and a random quote, `api.js` and
`store.js` are importable, and the console shows no errors. Test = manual /
browser check (the `/browse` skill can verify: load the page, toggle theme,
reload, confirm persistence and no console errors).

## 1. Page shell and layout

- [x] 1.1 Create `frontend/index.html` with the Tailwind CDN, an inline
  `tailwind.config` object (`darkMode: 'class'`, Inter in `fontFamily.sans`), the
  Inter Google Fonts link, inline Heroicons, and a single
  `<script type="module" src="js/main.js">` — files: frontend/index.html. Done:
  page loads via static server with Tailwind classes applied and Inter font
  active; no console errors.
- [x] 1.2 Add the responsive centered layout skeleton (`max-w-[900px]`, centered,
  generous padding; stacks to a single column below 768px) plus ALL mount-point
  ids from CONTRACTS.md §4 (`#theme-toggle`, `#quote`, `#toast-container`,
  `#todo-form`, `#todo-title`, `#todo-desc`, `#search-input`, `#filter-all/-active/-completed`,
  `#stat-all/-active/-completed`, `#progress-bar`, `#progress-label`, `#todo-list`,
  `#empty-state`, `#edit-modal`, `#delete-modal`, `#ai-panel`, `#ai-toggle`,
  `#ai-messages`, `#ai-input`, `#ai-send`) — files: frontend/index.html. Done:
  `document.querySelector` finds every id; no horizontal scroll at 375px width.
- [x] 1.3 Create `frontend/css/style.css` (custom animations / glassmorphism
  helpers beyond Tailwind) and the `frontend/assets/` directory — files:
  frontend/css/style.css, frontend/assets/. Done: stylesheet loads with no 404 and
  the assets directory exists.

## 2. Config and network layer

- [x] 2.1 Create `frontend/js/config.js` exporting
  `API_BASE_URL = "http://localhost:8000"` — files: frontend/js/config.js. Done:
  `import { API_BASE_URL } from './config.js'` resolves to the backend origin.
- [x] 2.2 Create `frontend/js/api.js` exporting `ApiError(status, detail)` and
  `api` with `listTodos()` (GET /todos), `getTodo(id)`, `createTodo({title,
  description})` (POST /todos), `updateTodo(id, patch)` (PUT /todos/{id}),
  `deleteTodo(id)` (DELETE /todos/{id} → void), and `chat(messages)` (POST
  /agent/chat → `{reply, tool_activity, todos_changed}`); every method builds the
  URL from `API_BASE_URL` and throws `ApiError` on any non-2xx (network/CORS
  failures wrapped as `ApiError(0, ...)`) — files: frontend/js/api.js. Done:
  module imports with no error; a 404 response causes `api.getTodo` to throw an
  `ApiError` whose `status`/`detail` match the response.

## 3. State store (sync backbone)

- [x] 3.1 Create `frontend/js/store.js` exporting `store` with `getTodos()`,
  `async refresh()` (re-fetch via `api.listTodos()` then notify), `setTodos(list)`
  (set + notify), `subscribe(fn)` returning an unsubscribe function, `filter`
  (`all`/`active`/`completed`, default `all`), `search` (string), `setFilter(f)`,
  and `setSearch(q)`; a private `notify()` calls every subscriber with the current
  todos on every mutation — files: frontend/js/store.js. Done: subscribing then
  calling `setTodos`/`setFilter`/`setSearch`/`refresh` invokes the subscriber, and
  the returned unsubscribe stops further calls.

## 4. Shared UI primitives

- [x] 4.1 Create `frontend/js/ui/toast.js` exporting `showToast(message, type)`
  (type `success`/`error`/`info`) that renders into `#toast-container` and
  auto-removes after 3 seconds — files: frontend/js/ui/toast.js. Done: calling
  `showToast` shows a toast top-right that disappears after 3s.
- [x] 4.2 Create `frontend/js/ui/modal.js` exporting `openModal(el)` and
  `closeModal(el)` with a dark blurred backdrop, focus trap, and Escape-to-close —
  files: frontend/js/ui/modal.js. Done: `openModal` shows the modal + backdrop and
  pressing Escape closes it.
- [x] 4.3 Create `frontend/js/ui/skeleton.js` exporting `showSkeletons(container,
  n)` (default 3 animated placeholder cards, no spinner) and
  `clearSkeletons(container)` — files: frontend/js/ui/skeleton.js. Done:
  `showSkeletons(el, 3)` renders three animated cards and `clearSkeletons` removes
  them.

## 5. Shell features

- [x] 5.1 Create `frontend/js/features/theme.js` exporting `initTheme()` that
  wires `#theme-toggle`, toggles the `dark` class on `<html>`, and persists the
  preference in localStorage (falling back to `prefers-color-scheme` on first
  load) — files: frontend/js/features/theme.js. Done: toggling then reloading
  restores dark mode from localStorage.
- [x] 5.2 Create `frontend/js/features/quote.js` exporting `initQuote()` that
  picks one random motivational quote and renders it into `#quote` on load —
  files: frontend/js/features/quote.js. Done: reloading shows a randomly selected
  quote in `#quote`.

## 6. Bootstrap

- [x] 6.1 Create `frontend/js/main.js` that on load runs `initTheme()` and
  `initQuote()`, then guarded-dynamic-imports `features/todos/index.js#initTodos`
  and `features/chat/index.js#initChat`, calling each initializer only if its
  module resolves (missing module skipped without error) — files:
  frontend/js/main.js. Done: with no feature modules present the shell renders
  (theme + quote + chrome) with no uncaught console error; when a feature module
  exists its initializer is called.

## 7. Done condition & verification

- [x] 7.1 Serve `frontend/` via a static server and verify the shell end-to-end —
  files: (none; verification only). Done: `cd frontend && python -m http.server
  5500`, open `http://localhost:5500`; the page renders with a working theme
  toggle and a random quote, `api.js`/`store.js` import cleanly, and the console
  is error-free. Test = manual / browser check (the `/browse` skill can automate:
  load page, toggle theme, reload, assert persistence and zero console errors).
