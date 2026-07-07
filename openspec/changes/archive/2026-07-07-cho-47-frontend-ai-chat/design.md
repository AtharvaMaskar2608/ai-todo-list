# Design: frontend-ai-chat

## Context

The AI assistant's UI is the `ai-chat-ui` capability. Per Contracts §6, this
feature owns only `frontend/js/features/chat/`:

- `index.js` — `export function initChat()`, the entry point dynamic-imported by
  the shell's `main.js` (Contracts §4). Wires the widget, conversation renderer,
  and client together against the pre-existing `#ai-*` mount points.
- `widget.js` — floating panel open/close behavior (`#ai-panel` / `#ai-toggle`).
- `conversation.js` — renders user/assistant messages, tool-activity chips, the
  loading indicator, and auto-scroll (`#ai-messages`).
- `client.js` — holds the in-memory `messages[]`, calls `api.chat(messages)`,
  appends the reply, and calls `store.refresh()` when `todos_changed` is true.

Consumed shell exports (Contracts §4): `api.chat`, `store.refresh`,
`store.getTodos`, `showToast`. Consumed backend response fields (Contracts §3):
`reply` (string), `tool_activity` (array of `{ tool, summary }`), `todos_changed`
(boolean). The server is stateless — the client always sends the complete
session `messages[]`.

## Goals / Non-Goals

**Goals**
- A floating, bottom-right chat widget that toggles open/closed and never
  obscures or blocks interaction with the main Todo UI.
- Session-only conversation memory sent as the full `messages[]` on each turn.
- Distinct visual treatment for user vs assistant messages.
- Tool-activity chips, a loading indicator while awaiting a reply, and
  auto-scroll to the newest message.
- Keep the main list in sync: on `todos_changed`, call `store.refresh()`.
- Graceful error handling for `api.chat` failures.

**Non-Goals**
- No persistence across reloads (no localStorage / no server-side history).
- No streaming/token-by-token rendering; the reply is rendered once received.
- No direct network calls — all traffic goes through `api.chat` (Contracts §4).
- No edits to `index.html`, shell modules, or the todos feature.
- No new mount IDs; only the shell-owned `#ai-*` IDs are used.

## Decisions

- **Floating bottom-right panel, non-blocking.** `#ai-panel` is fixed to the
  bottom-right; `#ai-toggle` opens/closes it. The panel overlays app chrome but
  does not disable the todo list, so users can watch tasks appear live while
  chatting. Closing the panel preserves conversation state (state lives in
  `client.js`, not the DOM lifecycle).
- **Session-only in-memory history.** `client.js` keeps `messages[]` as
  `{ role: "user" | "assistant", content: string }`. Each send appends the user
  message, POSTs the full array via `api.chat(messages)`, then appends the
  assistant `reply`. This matches the stateless server contract (§3). No
  storage; a reload clears the conversation by design.
- **Distinct user vs assistant styling.** `conversation.js` renders user bubbles
  and assistant bubbles with different alignment/color classes so the two are
  unmistakable, per project_context §"Frontend Chat".
- **Tool-activity chips.** For each response `tool_activity[]` entry, render a
  compact chip using its `summary` (e.g. "Created 'Buy milk'"), grouped with the
  assistant turn that produced it, so multi-step requests show what happened
  before the final concise `reply`.
- **Loading indicator.** Between send and response, disable `#ai-send` /
  `#ai-input` and show a "thinking" indicator in `#ai-messages`; remove it when
  the reply (or error) arrives.
- **Auto-scroll.** After appending any message, chip, or the loading indicator,
  scroll `#ai-messages` to the bottom so the latest content is always visible.
- **Sync on change.** When a response has `todos_changed === true`, `client.js`
  calls `store.refresh()`; the todos feature re-renders via its store
  subscription (Contracts §4/§5). The chat feature never touches the list DOM.
- **Graceful errors.** If `api.chat` throws (`ApiError`, network), remove the
  loading indicator, re-enable the input, keep the user's typed message in the
  conversation, and surface the failure via `showToast(detail, "error")` (with
  an inline error line as fallback). The user can retry.

### Contracts / signatures (this feature)

- `initChat(): void` — idempotent entry; queries `#ai-*` nodes, wires handlers.
  No-op if `#ai-panel` is absent (defensive; shell always provides it).
- `client.sendMessage(text): Promise<void>` — appends user turn, calls
  `api.chat(messages)`, appends assistant `reply`, renders `tool_activity`, and
  triggers `store.refresh()` on `todos_changed`.
- `conversation.renderMessage({ role, content })`, `renderToolActivity(items)`,
  `showLoading()` / `hideLoading()`, `scrollToLatest()`.
- `widget.open()`, `widget.close()`, `widget.toggle()`.

## Risks / Trade-offs

- **Risk: unbounded `messages[]` grows a long request payload / cost.**
  → Mitigation: session-only scope keeps conversations short; a soft cap /
  trim-oldest can be added later without changing the contract.
- **Risk: `store.refresh()` failing (network) leaves the list stale after a
  successful AI mutation.** → Mitigation: surface a toast on refresh failure and
  let the todos feature's normal refresh path recover; the chat reply still
  renders so the user knows the action succeeded server-side.
- **Risk: rapid double-submits create overlapping requests / duplicate turns.**
  → Mitigation: disable `#ai-input`/`#ai-send` and ignore submits while a request
  is in flight (the loading state doubles as a lock).
- **Risk: coupling to backend field names (`reply`, `tool_activity`,
  `todos_changed`).** → Mitigation: these are frozen in Contracts §3; consume
  them defensively (treat missing `tool_activity` as `[]`, missing
  `todos_changed` as falsy).
- **Risk: XSS from rendering AI/user text as HTML.** → Mitigation: render message
  content as text (set `textContent`, never `innerHTML`) for user- and
  model-supplied strings.
