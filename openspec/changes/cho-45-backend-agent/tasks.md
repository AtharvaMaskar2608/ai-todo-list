# Tasks: backend-agent

Done condition (overall): `POST /agent/chat` drives a create+list flow
end-to-end with a mocked Anthropic model in tests.
Test command: `cd backend && pytest tests/test_agent.py`

## 1. Package scaffold
- [x] 1.1 Create the agent package — files: backend/app/agent/__init__.py.
  Done: `from app import agent` imports cleanly.

## 2. Tool definitions + CRUD dispatch
- [x] 2.1 Define Anthropic tool schemas for create_todo, update_todo, delete_todo,
  list_todos, get_todo, search_todos, delete_completed (per CONTRACTS §3; update_*
  fields except id optional) — files: backend/app/agent/tools.py.
  Done: `tools.TOOL_DEFS` is a list of Anthropic tool dicts with name/description/
  input_schema for all seven tools.
- [x] 2.2 Implement `execute_tool(db, name, input) -> (result, is_error)` dispatching
  each tool to the matching `crud.*` (mapping to TodoCreate/TodoUpdate as needed),
  serializing Todo results, defining the mutating set, and returning not-found/
  exception cases as `is_error=True` — files: backend/app/agent/tools.py.
  Done: unit-callable dispatcher returns crud results for each tool and error
  strings for missing ids.

## 3. System prompt
- [x] 3.1 Author the system prompt: manage todos, use tools to read/mutate, never
  invent ids/contents, ask for clarification on ambiguity, confirm actions, stay
  concise — files: backend/app/agent/prompts.py.
  Done: `prompts.SYSTEM_PROMPT` is a non-empty string covering those instructions.

## 4. Agentic loop
- [x] 4.1 Implement `run_agent(db, messages) -> {reply, tool_activity, todos_changed}`:
  build Anthropic client with `settings.ANTHROPIC_MODEL`, convert messages, loop
  while `stop_reason == "tool_use"` executing tools via `execute_tool`, append
  assistant content + a single tool_result user message per iteration, compute
  tool_activity + todos_changed, enforce MAX_ITERATIONS — files:
  backend/app/agent/loop.py.
  Done: with a mocked Anthropic client, a create-then-final flow returns the
  expected reply, one tool_activity entry, and todos_changed=True.

## 5. Router / endpoint
- [x] 5.1 Add `POST /agent/chat` with `Depends(get_db)`, request/response Pydantic
  models (CONTRACTS §3), 503 when ANTHROPIC_API_KEY is unset, delegating to
  `loop.run_agent` — files: backend/app/routers/agent.py.
  Done: endpoint returns the contract shape on success and 503
  `{"detail":"AI assistant not configured"}` with no key.

## 6. Tests (mocked Anthropic)
- [x] 6.1 Test the end-to-end create+list flow with a mocked Anthropic client
  driving a tool_use then a final message; assert reply, ordered tool_activity,
  and todos_changed — files: backend/tests/test_agent.py.
  Done: `cd backend && pytest tests/test_agent.py` passes for the create+list flow.
- [x] 6.2 Test the safeguards: missing-key 503, graceful tool error
  (not-found id), read-only leaves todos_changed=False, and max-iteration cap —
  files: backend/tests/test_agent.py.
  Done: `cd backend && pytest tests/test_agent.py` passes all safeguard cases.
