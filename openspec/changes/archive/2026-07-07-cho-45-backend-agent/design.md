# Design: backend-agent

## Context

`docs/project_context.md` §35 requires an AI assistant that manages todos via
Anthropic's Messages API with tool calling, running an agentic loop until the
model stops requesting tools. Tools must call the existing `crud.*` business
logic directly (no self-HTTP). This change owns the server side: the
`POST /agent/chat` endpoint (CONTRACTS §3) and the `agent/` package (loop, tools,
prompt). It depends on `backend-core` (CONTRACTS §1) for `crud.*`, `get_db`,
and `config` (`ANTHROPIC_MODEL = "claude-sonnet-4-6"`, `ANTHROPIC_API_KEY`).

Loop mechanics below follow the `claude-api` skill's **manual agentic loop** for
the Anthropic Python SDK (`client.messages.create`).

## Goals / Non-Goals

Goals
- A stateless `POST /agent/chat` matching CONTRACTS §3 exactly.
- A correct agentic loop: continue while `stop_reason == "tool_use"`, stop on a
  normal assistant message (`end_turn`).
- Execute tools by calling `crud.*` directly against a `get_db` session.
- Report `tool_activity` (ordered) and `todos_changed` (mutating tools only).
- Graceful tool errors and a clear 503 when the API key is missing.

Non-Goals
- Persisting conversation server-side (client resends full `messages[]`).
- Streaming responses, extended thinking, or fast mode.
- Frontend rendering (owned by `frontend-ai-chat`).
- Editing `main.py`/`crud.py`/`config.py`/`requirements.txt` (owned by `backend-core`).

## Decisions

### Endpoint contract (CONTRACTS §3)
`POST /agent/chat` with `Depends(get_db)`.
- Request: `{ "messages": [ { "role": "user"|"assistant", "content": "string" } ] }`.
- Response: `{ "reply": str, "tool_activity": [ { "tool": str, "summary": str } ],
  "todos_changed": bool }`.
- Pydantic request/response models live in `routers/agent.py`; the router
  delegates all logic to `agent.loop.run_agent(db, messages)`.

### Agentic loop (`agent/loop.py`), grounded in the claude-api skill
- Construct `anthropic.Anthropic()` (reads `ANTHROPIC_API_KEY` from env). Model is
  `settings.ANTHROPIC_MODEL` (`"claude-sonnet-4-6"`), never hardcoded.
- Convert the request `messages[]` (role/content strings) into Anthropic message
  params; pass the system prompt as the top-level `system` field and `tools=`
  the tool definitions. `max_tokens` ~2048; no `thinking` configured (not needed
  for this tool-use workload).
- Loop:
  1. `resp = client.messages.create(model, system, tools, messages, max_tokens)`.
  2. If `resp.stop_reason != "tool_use"`: extract text from `text` blocks → that
     is `reply`; break.
  3. Append `{"role": "assistant", "content": resp.content}` (preserve the full
     content incl. `tool_use` blocks).
  4. For each `tool_use` block: dispatch via `tools.execute_tool`, build a
     `tool_result` block (`tool_use_id` matching), record a `tool_activity` entry
     and set `todos_changed` if the tool is mutating.
  5. Append all `tool_result` blocks as ONE `{"role": "user", ...}` message.
  6. Repeat.
- The loop parses `tool_use.input` via the SDK's already-parsed `block.input`
  dict — never raw-string-matches serialized JSON.

### Tools call `crud.*` directly, not self-HTTP (`agent/tools.py`)
- Anthropic tool definitions (name, description, `input_schema`) for: `create_todo`
  (title req, description opt), `update_todo` (id req; title/description/completed
  opt), `delete_todo` (id), `list_todos` (none), `get_todo` (id), `search_todos`
  (query), `delete_completed` (none).
- `execute_tool(db, name, input) -> (result_str, is_error)` dispatches to the
  matching `crud.*` with a `Session`, mapping inputs to `TodoCreate`/`TodoUpdate`
  where needed and serializing returned `Todo`(s) to compact dicts/JSON for the
  model. Mutating set = `{create_todo, update_todo, delete_todo, delete_completed}`.

### Computing `tool_activity` and `todos_changed`
- `tool_activity`: one ordered entry per executed tool, `{ "tool": <name>,
  "summary": <human string> }` (e.g. `"Created 'Buy milk'"`, `"Deleted 3 completed"`).
- `todos_changed`: `True` iff at least one executed tool was in the mutating set
  and did not error. Read-only tools never set it.

### Stateless server
The server holds no session; each call takes the full `messages[]` and rebuilds
Anthropic history from it.

### Graceful tool errors
A `crud.*` miss (e.g. `update_todo`/`get_todo`/`delete_todo` returns `None`/`False`)
or an exception is returned to the model as a `tool_result` with `is_error: True`
and an informative message; the loop continues so the model can recover or ask.
That tool does not flip `todos_changed`.

### Missing API key → 503
If `settings.ANTHROPIC_API_KEY` is empty/unset, the router raises
`HTTPException(503, "AI assistant not configured")` before any Anthropic call.

### Model from config
Always `settings.ANTHROPIC_MODEL` — the single config constant `"claude-sonnet-4-6"`.

### Clarify-on-ambiguity (from spec §35)
The system prompt instructs the model to ask a clarifying question instead of
guessing when a request is ambiguous (e.g. multiple tasks share a title) and to
never invent task ids or contents. Clarification is a normal assistant message
(no tool call), so the loop returns it as `reply` with empty `tool_activity`.

## Risks / Trade-offs

- **Infinite / runaway tool loop** → Mitigation: a `MAX_ITERATIONS` cap (e.g. 10);
  on hitting it the loop stops and returns the best available assistant text (or a
  safe fallback message) rather than looping forever.
- **Hallucinated / stale ids** → Mitigation: tools return not-found errors as
  `tool_result(is_error=True)` (from `crud` `None`/`False`), and the prompt forbids
  inventing ids; the model recovers by listing/searching or asking.
- **Cost & latency** (multi-step requests fan out to many tool calls) →
  Mitigation: modest `max_tokens`, the iteration cap, direct in-process `crud.*`
  calls (no network hops), and a concise system prompt.
- **Missing/invalid key at runtime** → 503 fast-fail keeps the failure explicit
  and testable rather than surfacing an opaque SDK error.
