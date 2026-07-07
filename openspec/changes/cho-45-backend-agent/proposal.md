# Proposal: backend-agent

## Why

The Todo app needs an AI assistant that turns natural-language requests
("add buy milk", "delete every completed task", "what's left?") into todo
mutations and answers, without the frontend parsing intent. Per
`docs/project_context.md` §35, the backend must run an **agentic tool-use loop**
on Anthropic's Messages API: Claude decides which tools to call, the backend
executes them against existing business logic, feeds results back, and repeats
until the model returns a normal message. This change adds the `POST /agent/chat`
endpoint and the loop, tool definitions, and system prompt behind it (CONTRACTS
§3). It is the server half of the AI feature that `frontend-ai-chat` consumes.

## What Changes

- Add `POST /agent/chat` (CONTRACTS §3): accepts `{ messages: [{role, content}] }`,
  returns `{ reply, tool_activity[], todos_changed }`. Server is stateless — the
  client sends the full conversation each turn.
- Add an agentic loop (`agent/loop.py`) on Anthropic's Messages API using
  `settings.ANTHROPIC_MODEL`; it iterates while `stop_reason == "tool_use"` and
  stops on a normal assistant message, with a max-iteration safeguard.
- Add Anthropic tool definitions and a dispatcher (`agent/tools.py`) mapping each
  tool to a `crud.*` call against a `get_db` session (NO self-HTTP): `create_todo`,
  `update_todo`, `delete_todo`, `list_todos`, `get_todo`, `search_todos`,
  `delete_completed`.
- Add the system prompt (`agent/prompts.py`): manage todos, use tools to read/
  mutate, never invent ids, ask for clarification on ambiguity, confirm actions,
  stay concise.
- Compute `tool_activity` (ordered, human-readable summaries) and `todos_changed`
  (true iff any mutating tool ran: create/update/delete/delete_completed).
- Return tool errors to the model as `tool_result` (graceful); return HTTP 503
  `{"detail": "AI assistant not configured"}` when `ANTHROPIC_API_KEY` is unset.
- Add `backend/tests/test_agent.py` driving the flow with a mocked Anthropic client.

All work lives in `backend/app/routers/agent.py`, `backend/app/agent/*`, and
`backend/tests/test_agent.py`. This change does NOT edit `main.py`, `crud.py`,
`config.py`, or `requirements.txt` (all owned by `backend-core`).

## Capabilities

### New Capabilities

- `ai-agent-chat`: Natural-language todo management via an agentic tool-use loop
  over Anthropic's Messages API — a stateless `POST /agent/chat` endpoint that
  loops until the model stops requesting tools, executes tools directly through
  `crud.*`, reports tool activity and whether todos changed, handles ambiguity by
  asking for clarification, and degrades gracefully on tool error or missing key.

### Modified Capabilities

None.

## Impact

- **Depends on `backend-core` (CONTRACTS §1):** `crud.list_todos/get_todo/
  create_todo/update_todo/delete_todo/search_todos/delete_completed`, the
  `TodoCreate`/`TodoUpdate` schemas, `get_db()` session dependency, and
  `config.get_settings()` exposing `ANTHROPIC_MODEL` (`"claude-sonnet-4-6"`) and
  `ANTHROPIC_API_KEY`. `main.py` already includes `routers.agent` up front, so
  this change only CREATES its router file. `backend-core` must land on `main`
  first.
- **Consumed by `frontend-ai-chat` (CONTRACTS §3):** the `{ reply, tool_activity,
  todos_changed }` response shape.
- **SDK / secrets:** uses the `anthropic` Python SDK (already declared in
  `backend-core`'s `requirements.txt`). Requires the `ANTHROPIC_API_KEY`
  environment variable at runtime; never hardcoded.
- **Owns / creates:** `backend/app/routers/agent.py`, `backend/app/agent/{__init__.py,
  loop.py,tools.py,prompts.py}`, `backend/tests/test_agent.py`.
- **Touches no shared files:** no `main.py`, `crud.py`, `config.py`, or
  `requirements.txt`. Safe to fan out once `backend-core` lands.
