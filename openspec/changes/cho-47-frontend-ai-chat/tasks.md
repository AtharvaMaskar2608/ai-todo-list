# Tasks: frontend-ai-chat

All files are under `frontend/js/features/chat/` (Contracts §6). This change
edits no `index.html` and no shell modules. It consumes shell exports `api.chat`,
`store.refresh`, `store.getTodos`, `showToast`, the `#ai-*` mount IDs
(Contracts §4), and the `/agent/chat` response fields `reply` / `tool_activity` /
`todos_changed` (Contracts §3).

**Overall done condition:** with the backend agent, frontend shell, and todos
features running together, typing "add a task called X" into the chat creates the
task via `api.chat` and the main Todo list refreshes automatically. Verify with
the `/browse` skill (open the app, open the chat, send the message, confirm the
new task card appears and a tool chip is shown).

## 1. Client & session state

- [ ] 1.1 Create `client.js` with in-memory `messages[]` and
  `sendMessage(text)`: append `{ role: "user", content }`, call
  `api.chat(messages)`, append `{ role: "assistant", content: reply }`, expose
  `tool_activity` and `todos_changed` to the renderer. — files:
  frontend/js/features/chat/client.js
  - Contract: `sendMessage(text): Promise<{ reply, tool_activity, todos_changed }>`;
    consumes `api.chat(messages)` (§4) returning `{ reply, tool_activity[], todos_changed }` (§3).
  - Done: `sendMessage` posts the full `messages[]` and returns the parsed
    response; unit-check by stubbing `api.chat` and asserting the array grows by
    one user + one assistant entry.
- [ ] 1.2 In `client.js`, call `store.refresh()` when `todos_changed === true`;
  treat missing `tool_activity` as `[]` and missing `todos_changed` as falsy. —
  files: frontend/js/features/chat/client.js
  - Contract: consumes `store.refresh()` (§4).
  - Done: with `todos_changed: true`, `store.refresh` is invoked exactly once;
    verify by stubbing `store` and asserting the call.

## 2. Conversation rendering

- [ ] 2.1 Create `conversation.js` with `renderMessage({ role, content })`
  rendering user vs assistant with distinct styling, using `textContent` (no
  `innerHTML`) for safety. — files: frontend/js/features/chat/conversation.js
  - Contract: renders into `#ai-messages` (§4).
  - Done: user and assistant messages appear with different classes; confirm in
    `/browse` that the two are visually distinct.
- [ ] 2.2 Add `renderToolActivity(items)` (chips from each entry's `summary`),
  `showLoading()` / `hideLoading()`, and `scrollToLatest()` that scrolls
  `#ai-messages` to the bottom after any append. — files:
  frontend/js/features/chat/conversation.js
  - Contract: consumes `tool_activity[].summary` (§3).
  - Done: chips render for each activity entry, the loading indicator shows/hides,
    and the pane auto-scrolls; verify via `/browse`.

## 3. Floating widget

- [ ] 3.1 Create `widget.js` with `open()`, `close()`, `toggle()` bound to
  `#ai-toggle` / `#ai-panel`, anchored bottom-right and non-blocking over the
  Todo UI. — files: frontend/js/features/chat/widget.js
  - Contract: uses shell mount IDs `#ai-panel`, `#ai-toggle` (§4).
  - Done: activating `#ai-toggle` opens then closes `#ai-panel` while the todo
    list stays interactive; verify via `/browse`.

## 4. Entry wiring

- [ ] 4.1 Create `index.js` exporting `initChat()` that queries `#ai-*` nodes,
  wires `widget`, `conversation`, and `client`, disables `#ai-input`/`#ai-send`
  while a request is in flight (loading = lock), and re-enables on reply/error. —
  files: frontend/js/features/chat/index.js
  - Contract: `export function initChat(): void`, dynamic-imported by shell
    `main.js` (§4); idempotent, no-op if `#ai-panel` absent.
  - Done: `initChat()` wires a working send/receive cycle end to end.
- [ ] 4.2 Wire graceful error handling: on `api.chat` rejection, `hideLoading()`,
  re-enable input with the typed message preserved, and call
  `showToast(detail, "error")`. — files: frontend/js/features/chat/index.js,
  frontend/js/features/chat/client.js
  - Contract: consumes `showToast(message, type)` (§4), `ApiError.detail` (§4).
  - Done: forcing `api.chat` to reject shows an error toast, keeps input, and
    re-enables the controls; verify via `/browse` with the backend stopped.

## 5. Integration verification

- [ ] 5.1 End-to-end check with backend agent + shell + todos running: open the
  app, open the chat, send "add a task called Buy milk", confirm a tool chip and
  a concise assistant reply appear and a "Buy milk" card shows in the list after
  `store.refresh()`. — files: frontend/js/features/chat/ (no code change; manual)
  - Test command / method: run backend + serve frontend, then use the `/browse`
    skill to drive the flow and screenshot the new task card.
  - Done: the new task appears in the main list and the chat shows the tool chip
    plus final reply, all without a page reload.
