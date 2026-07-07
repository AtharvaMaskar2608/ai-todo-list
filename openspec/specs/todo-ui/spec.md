# todo-ui Specification

## Purpose
TBD - created by archiving change cho-46-frontend-todos. Update Purpose after archive.
## Requirements
### Requirement: Task card rendering
The system SHALL render each todo in `#todo-list` as an elevated card showing a
completion checkbox, the title, the description (when present), the created
date, and edit and delete action buttons. Completed cards SHALL display a
green accent border, a checked/green checkbox, a strike-through title, and a
faded appearance. Cards SHALL lift (raise shadow / slight scale) on hover.

#### Scenario: Active task card
- **WHEN** a todo with `completed: false`, a title, a description, and a
  `created_at` is rendered
- **THEN** its card shows the checkbox unchecked, the title without
  strike-through, the description, a formatted created date, and edit and
  delete buttons, with no completed styling

#### Scenario: Completed task card
- **WHEN** a todo with `completed: true` is rendered
- **THEN** its card shows a green border, a checked green checkbox, a
  strike-through faded title, and still exposes the edit and delete buttons

### Requirement: Create task form
The system SHALL let the user create a todo from the form fields `#todo-title`
and `#todo-desc`. The title is required and MUST be trimmed before submission;
an empty-after-trim title MUST NOT submit. While the request is in flight the
submit control SHALL be disabled. On success the system SHALL clear the inputs,
show a success toast via `ui/toast`, refresh the list via `store.refresh()`, and
animate the new card in.

#### Scenario: Valid submission
- **WHEN** the user enters a non-empty title and submits the form
- **THEN** the submit button is disabled during the request, `api.createTodo`
  is called with the trimmed title and description, and on success the inputs
  clear, a success toast appears, `store.refresh()` runs, and the new card
  animates in

#### Scenario: Empty title rejected
- **WHEN** the user submits with a title that is empty or only whitespace
- **THEN** no request is made and the form is not cleared

### Requirement: Toggle completion via checkbox
The system SHALL toggle a todo's completion when its card checkbox is clicked by
calling `api.updateTodo(id, { completed })` with the new value and then
`store.refresh()`. On an `ApiError` it SHALL show an error toast and leave the
displayed state unchanged.

#### Scenario: Mark a task complete
- **WHEN** the user clicks the unchecked checkbox on an active task
- **THEN** `api.updateTodo(id, { completed: true })` is called and, on success,
  `store.refresh()` runs so the card re-renders with completed styling

#### Scenario: Toggle failure
- **WHEN** `api.updateTodo` rejects with an `ApiError` during a toggle
- **THEN** an error toast is shown and the checkbox reflects the unchanged
  server state after the next render

### Requirement: Edit task via modal
The system SHALL open `#edit-modal` (using `ui/modal`) prefilled with a todo's
title, description, and completed state when its edit button is clicked. Saving
SHALL call `api.updateTodo(id, patch)` with the edited fields, then close the
modal, show a toast, and run `store.refresh()`. Cancel SHALL close the modal
without changes.

#### Scenario: Save edits
- **WHEN** the user edits a task's title in the edit modal and clicks Save
- **THEN** `api.updateTodo(id, patch)` is called with the changed fields, the
  modal closes, a success toast appears, and `store.refresh()` re-renders the
  updated card

#### Scenario: Cancel edit
- **WHEN** the user opens the edit modal and clicks Cancel
- **THEN** the modal closes and no update request is made

### Requirement: Delete task with confirmation
The system SHALL open `#delete-modal` (using `ui/modal`) when a delete button is
clicked. Confirming SHALL animate the card out, then call `api.deleteTodo(id)`,
show a toast, and run `store.refresh()`. Cancel SHALL close the modal and leave
the task in place.

#### Scenario: Confirm delete
- **WHEN** the user clicks delete on a card and confirms in the modal
- **THEN** the card plays its animate-out transition, `api.deleteTodo(id)` is
  called, a toast appears, and `store.refresh()` removes it from the list

#### Scenario: Cancel delete
- **WHEN** the user opens the delete modal and clicks Cancel
- **THEN** the modal closes, no delete request is made, and the card remains

### Requirement: Live search
The system SHALL filter the visible list live as the user types in
`#search-input`, with no submit button, by writing the query to
`store.setSearch(q)`. Matching SHALL be case-insensitive over each todo's title
OR description.

#### Scenario: Search narrows the list
- **WHEN** the user types "milk" into the search input
- **THEN** `store.setSearch("milk")` is called and only todos whose title or
  description contains "milk" (case-insensitive) remain rendered

#### Scenario: Clearing search restores the list
- **WHEN** the user clears the search input
- **THEN** `store.setSearch("")` is called and all todos matching the active
  filter are rendered again

### Requirement: Filter pills
The system SHALL provide All / Active / Completed pill buttons
(`#filter-all`, `#filter-active`, `#filter-completed`) that set
`store.setFilter(...)`. The active pill SHALL render filled and the others
outlined. The list SHALL show all todos, only incomplete todos, or only
completed todos accordingly, combined with any active search.

#### Scenario: Select Active filter
- **WHEN** the user clicks the Active pill
- **THEN** `store.setFilter("active")` is called, the Active pill renders
  filled, and only incomplete todos are shown

#### Scenario: Filter and search combine
- **WHEN** the Completed filter is active and the user types a search term
- **THEN** only completed todos whose title or description matches the term are
  rendered

### Requirement: Statistics cards
The system SHALL display counts of all, active, and completed todos in
`#stat-all`, `#stat-active`, and `#stat-completed`, recomputed from `store` on
every change, and SHALL animate the cards when their values change.

#### Scenario: Counts update on change
- **WHEN** a task is created, deleted, or toggled
- **THEN** the all, active, and completed counts recompute from the current
  store state and the changed stat cards animate

#### Scenario: Empty list counts
- **WHEN** there are no todos
- **THEN** all three stat cards show 0

### Requirement: Animated progress bar
The system SHALL render a progress bar (`#progress-bar`) and label
(`#progress-label`) showing the percentage of completed todos, with an animated
width transition, recalculated on every store change. An empty list SHALL show
0%.

#### Scenario: Progress reflects completion
- **WHEN** 3 of 4 todos are completed
- **THEN** the progress bar animates to 75% width and the label reads a 75%
  complete message

#### Scenario: No tasks
- **WHEN** there are no todos
- **THEN** the progress bar shows 0% and the label reflects 0% complete

### Requirement: Empty state
The system SHALL show the `#empty-state` block with an illustrative icon, a
message, and a call-to-action button when no todos are visible, and hide the
list; otherwise it SHALL hide the empty state and show the list.

#### Scenario: No todos at all
- **WHEN** the store holds zero todos
- **THEN** the empty state is shown with its call-to-action and `#todo-list` is
  hidden

#### Scenario: Empty due to filter or search
- **WHEN** todos exist but none match the active filter and search
- **THEN** the empty state is shown and no cards are rendered

### Requirement: Confetti celebration
The system SHALL trigger a confetti animation once when a non-empty todo list
becomes fully completed, and SHALL NOT repeat it until at least one task becomes
active again. An empty list SHALL NOT trigger confetti.

#### Scenario: All tasks completed
- **WHEN** the last active task is completed so every todo is complete
- **THEN** confetti fires exactly once and does not fire again while all tasks
  remain complete

#### Scenario: Re-arm after a task becomes active
- **WHEN** a new active task is added (or one is un-completed) after a
  celebration, and then all tasks are completed again
- **THEN** confetti fires once more

### Requirement: Keyboard support
The system SHALL create a task when the user presses Enter in the create form,
and SHALL close an open modal when the user presses Escape (via `ui/modal`).

#### Scenario: Enter creates a task
- **WHEN** the create form's title field has a valid value and the user presses
  Enter
- **THEN** the form submits and the create flow runs, the same as clicking Add

#### Scenario: Escape closes a modal
- **WHEN** the edit or delete modal is open and the user presses Escape
- **THEN** the modal closes with no change to the todo

