# Parallelization Plan — ai-todo-list

Derived from the six OpenSpec changes under `openspec/changes/`. Governs the order
in which changes land on `main` and what may run concurrently. Follows the rules in
[CLAUDE.md](../CLAUDE.md): shared contracts land before fan-out; overlapping-file or
undefined-contract tasks never run in parallel.

Frozen shared interfaces: see the contract reference (scratchpad `CONTRACTS.md`),
mirrored in `openspec/config.yaml` context. Backend §1–§3, frontend §4–§6.

## Changes

| Change | Capability(s) | Owns (files/dirs) | Depends on |
|---|---|---|---|
| `cho-42-backend-core` | `todo-persistence`, `backend-foundation` | `backend/app/{database,models,schemas,crud,config,main,__init__}.py`, `backend/requirements.txt` | — (contract owner) |
| `cho-43-frontend-shell` | `frontend-foundation` | `frontend/index.html`, `frontend/css/`, `frontend/assets/`, `frontend/js/{config,api,store,main}.js`, `frontend/js/ui/*`, `frontend/js/features/{theme,quote}.js` | — (contract owner) |
| `cho-44-backend-todos-api` | `todos-rest-api` | `backend/app/routers/todos.py`, `routers/__init__.py`, `backend/tests/test_todos_api.py` | `cho-42-backend-core` (§1) |
| `cho-45-backend-agent` | `ai-agent-chat` | `backend/app/routers/agent.py`, `backend/app/agent/*`, `backend/tests/test_agent.py` | `cho-42-backend-core` (§1, §3) |
| `cho-46-frontend-todos` | `todo-ui` | `frontend/js/features/todos/*` | `cho-43-frontend-shell` (§4) |
| `cho-47-frontend-ai-chat` | `ai-chat-ui` | `frontend/js/features/chat/*` | `cho-43-frontend-shell` (§4), `cho-45-backend-agent` (§3, for end-to-end) |

## Execution waves

### Wave 0 — Contracts (must land on `main` first)
Run **in parallel** — disjoint file trees (`backend/` vs `frontend/`), zero overlap:
- `cho-42-backend-core`
- `cho-43-frontend-shell`

Both are the only changes permitted to touch dependency/config/entrypoint files
(`requirements.txt`, `main.py`, `config.py`; `index.html`, `main.js`). Merge both to
`main` before starting Wave 1 so every dependent builds against a stable contract.

### Wave 1 — Feature fan-out (all parallel once Wave 0 is on `main`)
No two share a file; all four run concurrently in separate worktrees/branches:
- `cho-44-backend-todos-api`  ← cho-42-backend-core
- `cho-45-backend-agent`      ← cho-42-backend-core
- `cho-46-frontend-todos`     ← cho-43-frontend-shell
- `cho-47-frontend-ai-chat`   ← cho-43-frontend-shell (+ cho-45-backend-agent for live E2E)

```
        Wave 0 (contracts)                 Wave 1 (features, parallel)
  ┌─ cho-42-backend-core ──────────┬─→ cho-44-backend-todos-api
  │                         └─→ cho-45-backend-agent ────────┐
  │                                                   ↓
  └─ cho-43-frontend-shell ────────┬─→ cho-46-frontend-todos        (E2E)
                            └─→ cho-47-frontend-ai-chat ──────┘
```

## Merge-conflict review (per CLAUDE.md)

File-ownership is disjoint across all six changes — no two changes write the same
file. Verified couplings and their resolutions:

1. **`main.py` router includes (cho-42-backend-core vs cho-44-backend-todos-api / cho-45-backend-agent).**
   Resolved: `cho-42-backend-core` pre-wires guarded `include_router(routers.todos)` and
   `include_router(routers.agent)` up front. The two router changes only CREATE their
   router file; neither edits `main.py`. No conflict.
2. **`requirements.txt` / `config.py` (anthropic dep + model constant).**
   Resolved: owned solely by `cho-42-backend-core`, which ships the `anthropic` dependency and
   `ANTHROPIC_MODEL = "claude-sonnet-4-6"` / `ANTHROPIC_API_KEY`. `cho-45-backend-agent` consumes
   them, edits neither.
3. **`index.html` mount IDs (cho-43-frontend-shell vs cho-46-frontend-todos / cho-47-frontend-ai-chat).**
   Resolved: `cho-43-frontend-shell` owns `index.html` and defines every mount ID. Feature
   changes only `querySelector` them. No feature edits `index.html`.
4. **`main.js` bootstrap (cho-43-frontend-shell vs feature entry points).**
   Resolved: `main.js` (shell) uses guarded dynamic `import()` of
   `features/todos/index.js#initTodos` and `features/chat/index.js#initChat`. Shell runs
   standalone; features only create their own entry files. No conflict.
5. **Edit/delete modal inner markup (cho-43-frontend-shell vs cho-46-frontend-todos).** *(under-specified — now pinned)*
   Resolved: shell ships `#edit-modal` / `#delete-modal` as EMPTY containers +
   generic `ui/modal.js` (backdrop, Escape, focus trap). `cho-46-frontend-todos` owns the inner
   form markup (title/desc/completed inputs, Save/Cancel/Delete) and renders it via JS.
   Shell defines no todo-specific field IDs. Recorded in CONTRACTS.md §5.
6. **Store as the AI↔list sync point (cho-46-frontend-todos vs cho-47-frontend-ai-chat).**
   Not a file conflict — both import `store` from shell and use documented methods only.
   `cho-47-frontend-ai-chat` calls `store.refresh()` on `todos_changed`; `cho-46-frontend-todos`
   re-renders via `store.subscribe`. Disjoint dirs (`features/chat/` vs `features/todos/`).

No changes to lockfiles/migrations beyond the explicitly-assigned `cho-42-backend-core`
(`requirements.txt`). SQLite has no migration files (tables created on startup).

## Per-change done conditions (summary)
- `cho-42-backend-core`: `uvicorn app.main:app` boots, `GET /health` → ok, `pytest` for crud passes.
- `cho-44-backend-todos-api`: 5 endpoints pass `pytest tests/test_todos_api.py`.
- `cho-45-backend-agent`: create+list flow drives end-to-end with mocked model, `pytest tests/test_agent.py`.
- `cho-43-frontend-shell`: page renders (theme toggle + quote), `api`/`store` importable, no console errors.
- `cho-46-frontend-todos`: full CRUD/search/filter/complete works against backend+shell (verify via `/browse`).
- `cho-47-frontend-ai-chat`: "add a task called X" via chat creates it and the list refreshes (verify via `/browse`).
