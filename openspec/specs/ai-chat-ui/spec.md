# ai-chat-ui Specification

## Purpose
TBD - created by archiving change cho-47-frontend-ai-chat. Update Purpose after archive.
## Requirements
### Requirement: Floating chat widget toggle

The system SHALL present a floating chat widget anchored bottom-right that the
user can open and close via `#ai-toggle`, and it MUST NOT block interaction with
the main Todo UI while open.

#### Scenario: Open and close the widget

- **WHEN** the user activates `#ai-toggle` while the panel is closed
- **THEN** `#ai-panel` becomes visible in the bottom-right, and activating
  `#ai-toggle` again hides `#ai-panel` while the main Todo list stays interactive.

### Requirement: Send message shows in history with loading indicator

The system SHALL append the user's message to `#ai-messages` immediately on send
and MUST show a loading indicator while awaiting the `api.chat` response, with
`#ai-input` and `#ai-send` disabled until the response (or error) arrives.

#### Scenario: User submits a message

- **WHEN** the user types text into `#ai-input` and activates `#ai-send`
- **THEN** the text appears as a user message in `#ai-messages`, a loading
  indicator is shown, and the input and send control are disabled until a reply
  or error returns.

### Requirement: Assistant reply rendered distinctly

The system SHALL render the assistant's `reply` in `#ai-messages` with styling
visually distinct from user messages once `api.chat` resolves.

#### Scenario: Assistant reply arrives

- **WHEN** `api.chat` resolves with a `reply` string
- **THEN** the loading indicator is removed and the `reply` is rendered as an
  assistant message styled distinctly from user messages.

### Requirement: Tool activity displayed

The system SHALL render each `tool_activity` entry from the response as a
compact chip in `#ai-messages` using its `summary`, and MUST treat a missing or
empty `tool_activity` as no chips.

#### Scenario: Response includes tool activity

- **WHEN** `api.chat` resolves with `tool_activity` containing
  `{ "tool": "create_todo", "summary": "Created 'Buy milk'" }`
- **THEN** a chip reading "Created 'Buy milk'" is shown grouped with the
  assistant turn, and no chips are shown when `tool_activity` is empty or absent.

### Requirement: Auto-scroll to latest message

The system SHALL scroll `#ai-messages` to the bottom whenever a message, chip,
or loading indicator is appended, so the most recent content is visible.

#### Scenario: New content appended

- **WHEN** any user message, assistant reply, tool chip, or loading indicator is
  appended to `#ai-messages`
- **THEN** `#ai-messages` scrolls to its bottom so the newest content is in view.

### Requirement: Session-only conversation history

The system SHALL keep the conversation in memory for the current session and
send the full `messages[]` array to `api.chat` on every turn, and it MUST NOT
persist history across a page reload.

#### Scenario: Conversation retained during session, cleared on reload

- **WHEN** the user exchanges several turns, then closes and reopens the panel,
  then reloads the page
- **THEN** the prior turns remain visible after reopening and each send posts the
  complete `messages[]`, but after the page reload the conversation is empty.

### Requirement: Main list refreshes when todos change

The system SHALL call `store.refresh()` when a response has
`todos_changed === true`, so the main Todo list re-renders to reflect AI changes.

#### Scenario: AI mutates todos

- **WHEN** `api.chat` resolves with `todos_changed: true`
- **THEN** `store.refresh()` is invoked and the main Todo list re-renders via its
  store subscription without the chat feature touching the list DOM.

### Requirement: Graceful error handling

The system SHALL handle `api.chat` failures without losing the user's input:
remove the loading indicator, re-enable `#ai-input` and `#ai-send`, and surface
the error via a toast (with an inline error as fallback).

#### Scenario: api.chat fails

- **WHEN** `api.chat` rejects with an error or network failure
- **THEN** the loading indicator is removed, the input and send control are
  re-enabled with the user's message preserved, and an error is surfaced via
  `showToast(detail, "error")` so the user can retry.

### Requirement: Multi-step request shows final concise reply

The system SHALL, for a request that triggers multiple tool steps, display the
intermediate tool-activity chips and then render the single final `reply` as the
assistant's concise response.

#### Scenario: Multi-step request completes

- **WHEN** the user sends a request whose response includes multiple
  `tool_activity` entries and one final `reply`
- **THEN** each tool step is shown as a chip and the final `reply` is rendered
  once as the concise assistant message for that turn.

