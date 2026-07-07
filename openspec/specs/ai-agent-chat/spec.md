# ai-agent-chat Specification

## Purpose
TBD - created by archiving change cho-45-backend-agent. Update Purpose after archive.
## Requirements
### Requirement: Chat endpoint request/response shape
The system SHALL expose `POST /agent/chat` that accepts a request body
`{ "messages": [ { "role": "user"|"assistant", "content": "string" } ] }` and
responds with `{ "reply": string, "tool_activity": [ { "tool": string, "summary":
string } ], "todos_changed": boolean }`. The server MUST be stateless: it derives
all conversation context from the supplied `messages` array on each call.

#### Scenario: Valid chat request returns the contract response shape
- **WHEN** a client POSTs `{ "messages": [ { "role": "user", "content": "hi" } ] }`
  to `/agent/chat` with a configured API key
- **THEN** the response is `200` with a JSON body containing string `reply`, an
  array `tool_activity` of `{ tool, summary }` objects, and a boolean
  `todos_changed`.

### Requirement: Agentic loop continues until no tool use
The system SHALL run an agentic loop on Anthropic's Messages API using the model
from configuration, continuing while the model's `stop_reason` is `"tool_use"`
and stopping when the model returns a normal assistant message; the final
assistant text MUST be returned as `reply`.

#### Scenario: Loop stops on a normal assistant message
- **WHEN** the model first returns a `tool_use` response and, after the tool
  result is provided, returns a normal message with `stop_reason` other than
  `"tool_use"`
- **THEN** the system stops looping and returns that message's text as `reply`.

### Requirement: Tools invoke CRUD business logic directly
The system SHALL execute each requested tool by calling the corresponding
`crud.*` function against a database session (create_todo, update_todo,
delete_todo, list_todos, get_todo, search_todos, delete_completed) and MUST NOT
make HTTP requests to its own API to perform tool actions.

#### Scenario: create_todo tool call invokes crud.create_todo
- **WHEN** the model emits a `tool_use` block for `create_todo` with a title
- **THEN** the system calls `crud.create_todo` with that data on the request
  session and returns the created todo to the model as a `tool_result`.

### Requirement: todos_changed reflects mutating tools
The system SHALL set `todos_changed` to `true` if and only if at least one
mutating tool (create_todo, update_todo, delete_todo, delete_completed) executed
successfully during the turn; read-only tools (list_todos, get_todo,
search_todos) MUST NOT set it.

#### Scenario: Read-only request leaves todos_changed false
- **WHEN** the model only calls `list_todos` to answer "what tasks do I have left?"
- **THEN** the response `todos_changed` is `false`.

### Requirement: Multi-step requests execute across iterations
The system SHALL support multi-step requests where the model chains tool calls
across loop iterations (e.g. list todos, then update each incomplete one, then
summarize), executing every requested tool and recording each in `tool_activity`
in order.

#### Scenario: "Mark everything completed" lists then updates each todo
- **WHEN** the model calls `list_todos`, then `update_todo` for each incomplete
  todo, then returns a confirmation
- **THEN** the system executes each tool in order, `tool_activity` contains an
  ordered entry per executed tool, `todos_changed` is `true`, and `reply` is the
  confirmation.

### Requirement: Ambiguous requests ask for clarification
The system's agent prompt SHALL instruct the model to ask a clarifying question
instead of guessing when a request is ambiguous (e.g. multiple todos share a
title); such a clarification MUST be returned as `reply` with no tool executed.

#### Scenario: Ambiguous rename returns a clarifying question
- **WHEN** the user asks to rename "Homework" and two todos are titled "Homework"
  so the model responds with a clarifying question and no `tool_use`
- **THEN** the response `reply` contains that clarifying question, `tool_activity`
  is empty, and `todos_changed` is `false`.

### Requirement: The agent never invents task ids or contents
The system's agent prompt SHALL instruct the model never to invent task ids or
task contents, and the system MUST return a not-found error to the model when a
tool targets an id that does not exist so the model can recover.

#### Scenario: update_todo on a missing id returns a not-found tool_result
- **WHEN** the model calls `update_todo` with an id that `crud.update_todo`
  resolves to `None`
- **THEN** the system returns a `tool_result` marked as an error indicating the
  todo was not found, the loop continues, and `todos_changed` is not set by that
  call.

### Requirement: Tool errors are handled gracefully
The system SHALL catch tool-execution failures and return them to the model as a
`tool_result` marked as an error with an informative message, rather than
aborting the request, so the model can adjust or ask the user.

#### Scenario: A failing tool is reported to the model, not raised
- **WHEN** a tool execution fails (missing target or raised exception)
- **THEN** the system feeds an error `tool_result` back into the loop and the
  request still completes with a coherent `reply`.

### Requirement: Missing API key returns 503
The system SHALL return HTTP `503` with body `{ "detail": "AI assistant not
configured" }` when the `ANTHROPIC_API_KEY` is unset, without calling the
Anthropic API.

#### Scenario: No API key configured yields 503
- **WHEN** a client POSTs to `/agent/chat` while `ANTHROPIC_API_KEY` is empty or
  unset
- **THEN** the response is `503` with `{ "detail": "AI assistant not configured" }`
  and no Anthropic request is made.

### Requirement: Max-iteration safeguard prevents infinite loops
The system SHALL enforce a maximum number of loop iterations; when the cap is
reached it MUST stop looping and return a response rather than calling tools
indefinitely.

#### Scenario: Loop terminates at the iteration cap
- **WHEN** the model keeps returning `tool_use` responses without ever finishing
- **THEN** the system halts at the configured maximum iterations and returns a
  final response instead of looping forever.

