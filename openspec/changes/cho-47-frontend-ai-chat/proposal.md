# Proposal: frontend-ai-chat

## Why

The Todo app ships an AI assistant, but users need a way to talk to it. The
backend exposes `POST /agent/chat` (Contracts §3) and the shell exposes
`api.chat(messages)` plus the `#ai-*` mount points (Contracts §4), yet nothing
renders a chat surface or wires responses back into the todo list. We need a
floating chat widget that lets users manage todos in natural language and keeps
the main list in sync after the AI mutates data. This is the user-facing half of
the AI feature described in `docs/project_context.md` §"Frontend Chat" and
§"Synchronization".

## What Changes

- Add a floating, bottom-right chat widget (open/close) that never blocks the
  main Todo UI.
- Maintain a session-only, in-memory conversation and send the full `messages[]`
  array to `api.chat` on every turn (server is stateless per Contracts §3).
- Render user vs assistant messages with distinct styling, show tool-activity
  chips, a loading indicator while awaiting the reply, and auto-scroll to the
  latest message.
- When a response reports `todos_changed`, call `store.refresh()` so the main
  list re-renders automatically.
- Handle `api.chat` errors gracefully (toast / inline error, no lost input).

All work lives under `frontend/js/features/chat/` (Contracts §6). This change
edits no `index.html` and no shell modules.

## Capabilities

### New Capabilities

- `ai-chat-ui`: A floating chat widget that renders a session conversation with
  the AI assistant, displays tool activity and loading state, auto-scrolls,
  refreshes the todo list when the AI changes data, and degrades gracefully on
  error.

### Modified Capabilities

None.

## Impact

- **Depends on `frontend-shell` (Contracts §4):**
  - `api.chat(messages)` — the only network call this feature makes.
  - `store.refresh()` and `store.getTodos()` — invoked after `todos_changed`.
  - `showToast(message, type)` (`ui/toast.js`) — error surfacing.
  - Mount IDs owned by the shell: `#ai-panel`, `#ai-toggle`, `#ai-messages`,
    `#ai-input`, `#ai-send`.
  - `main.js` guarded dynamic import of `features/chat/index.js#initChat`.
- **Depends on `backend-agent` (Contracts §3):** the `POST /agent/chat` response
  shape `{ reply, tool_activity[], todos_changed }`. This feature consumes those
  fields; it does not call the endpoint directly (it goes through `api.chat`).
- **Owns / creates (Contracts §6):** `frontend/js/features/chat/index.js`,
  `widget.js`, `conversation.js`, `client.js`.
- **Touches no shared files:** no `index.html`, no shell modules, no lockfiles,
  no config. Safe to fan out once `frontend-shell` and `backend-agent` contracts
  land on `main`.
