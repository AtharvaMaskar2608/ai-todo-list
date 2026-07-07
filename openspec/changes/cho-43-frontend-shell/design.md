## Context

This change translates CONTRACTS.md §4 (the frozen frontend module contract)
and docs/project_context.md sections 1–11, 20–23, and 31 into the shared
browser-side foundation. Two dependent changes — `frontend-todos`
(`features/todos/`) and `frontend-ai-chat` (`features/chat/`) — consume these
signatures and mount IDs. Because they run in parallel after this lands, the
shell must fix every shared symbol and DOM id exactly as CONTRACTS.md specifies
and must own `index.html` and every shell module outright so no feature change
ever needs to write them.

## Goals / Non-Goals

**Goals:**
- Provide `index.html` carrying ALL mount-point IDs from CONTRACTS.md §4 so
  feature modules only `querySelector` them, never create or edit them.
- Provide `api` as the single network client with a uniform `ApiError` failure
  mode, and `store` as the pub/sub sync backbone that keeps the todo list and AI
  chat consistent.
- Provide reusable `toast`, `modal`, and `skeleton` primitives so features share
  one implementation of each interaction pattern.
- Boot the shell standalone (theme + quote + chrome) even before any feature
  module exists.

**Non-Goals:**
- No todo behavior — cards, form, filters, stats, confetti (owned by
  `frontend-todos`, `features/todos/`).
- No chat behavior — widget, conversation, client loop (owned by
  `frontend-ai-chat`, `features/chat/`).
- No build step, bundler, or npm dependencies — Tailwind and fonts load via CDN.
- No backend code; `api` targets the contract in CONTRACTS.md §1–§3.

## Decisions

- **ES6 modules instead of a single `script.js`.** The app is split into
  `config.js`, `api.js`, `store.js`, `ui/*`, `features/*`, and `main.js` rather
  than one script file. This is the enabling decision for parallel work: the
  shell owns the shared modules, and each feature owns an isolated directory
  under `features/`, so `frontend-todos` and `frontend-ai-chat` touch disjoint
  files and never conflict. `index.html` loads exactly one entry
  (`<script type="module" src="js/main.js">`); everything else is reached via
  `import`.
- **`api.js` is the sole network layer with `ApiError`.** Only `api.js` calls
  `fetch`. Every method builds the URL from `API_BASE_URL`, and any non-2xx
  response is turned into a thrown `ApiError(status, detail)` (detail parsed from
  the JSON body's `detail`, falling back to a generic message). Callers never
  branch on `response.ok`; they `try/catch` and show a toast. This centralizes
  error shape and keeps features free of URL/HTTP knowledge.
- **`store.js` pub/sub is the AI↔list sync backbone.** `store` holds the loaded
  `todos` plus view state (`filter`, `search`). Any mutation (`setTodos`,
  `refresh`, `setFilter`, `setSearch`) runs a private `notify()` that invokes
  every subscriber with the current todos. The todo feature subscribes and
  re-renders; the chat feature, after a `todos_changed` reply, calls
  `store.refresh()` — which re-fetches and notifies — so the list updates without
  the two features referencing each other. `subscribe(fn)` returns an
  unsubscribe function.
- **`index.html` owns all mount IDs so feature changes never touch it.** Every
  id in CONTRACTS.md §4 (todo, stats, filter, modal, and AI ids) is present in
  the shell markup from day one, even for features not yet built. Features query
  these ids; they add no markup to `index.html`. This removes the single biggest
  merge-conflict risk during fan-out.
- **`main.js` uses guarded dynamic import so the shell runs standalone.**
  Bootstrap synchronously runs `initTheme()` and `initQuote()` (always present),
  then `await import('./features/todos/index.js')` and the chat equivalent inside
  `try/catch`, calling `initTodos()`/`initChat()` only if the module resolves.
  Before the feature changes land, the imports fail softly and the shell still
  renders with working theme, quote, and chrome — no console errors that block.
- **Tailwind via a CDN config object.** `index.html` loads the Tailwind CDN and
  sets `tailwind.config = { darkMode: 'class', theme: { extend: { fontFamily:
  { sans: ['Inter', ...] } } } }` inline before use, so utility classes,
  dark-mode variants, and the Inter font are available without a build step.
- **Dark mode via `class` strategy + localStorage.** `initTheme` reads a
  persisted preference (or the OS `prefers-color-scheme` on first visit), toggles
  the `dark` class on `<html>`, and writes the choice to localStorage on every
  toggle so it survives reloads. Because Tailwind's `darkMode` is `class`, every
  `dark:` utility responds to that single root class.
- **Alternatives considered:** (a) one `script.js` with all logic — rejected
  because it serializes the two feature changes onto one file; (b) a bundler
  (Vite/esbuild) — rejected as unnecessary weight for a CDN-Tailwind, no-deps app
  and against the project's "Vanilla JS, no frameworks" constraint; (c) features
  injecting their own mount points into `index.html` — rejected as a guaranteed
  merge conflict during fan-out.

## Risks / Trade-offs

- **CDN Tailwind is not recommended for production** (unpurged, runtime-compiled)
  → Mitigation: acceptable for this portfolio/local app per the spec's explicit
  "Tailwind CSS (CDN)" choice; note a build-time Tailwind + purge as future work
  if this ships to real production traffic.
- **ES module CORS / `file://` origin** — modules and `fetch` fail when
  `index.html` is opened directly from disk → Mitigation: the documented run
  method is a static server (e.g. `python -m http.server`); the done-condition
  and README call this out, and `API_BASE_URL` targets the backend origin.
- **Guarded dynamic imports can hide a real error inside a feature module** →
  Mitigation: catch only the module-not-found case for a missing feature; when a
  feature module IS present, let its own runtime errors surface (log them) rather
  than swallowing, so genuine bugs are visible during feature development.
- **Central `ApiError` could obscure network-vs-HTTP failures** → Mitigation:
  wrap `fetch` rejections (network down / CORS) as `ApiError(0, ...)` so callers
  still get one catchable type while status `0` distinguishes transport failure
  from an HTTP error.
