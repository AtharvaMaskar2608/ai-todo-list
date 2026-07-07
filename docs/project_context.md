# Modern Todo App – Full Project Specification

## 1. Project Overview

Build a **modern, responsive, visually engaging Todo application** using:

* **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
* **Backend:** FastAPI
* **Database:** SQLite

This project should demonstrate a complete CRUD application while looking like a polished SaaS product rather than a basic classroom assignment.

The application should prioritize:

* Beautiful UI
* Smooth animations
* Responsive design
* Clean architecture
* RESTful APIs
* Good coding practices

The final result should feel similar to modern productivity apps such as **Todoist, TickTick, Microsoft To Do, Notion, or Linear**.

---

# 2. Tech Stack

## Frontend

* HTML5
* Tailwind CSS (CDN)
* Vanilla JavaScript (ES6+)
* Fetch API
* Google Fonts (Inter)
* Heroicons (SVG)

No React, Vue, Angular, Bootstrap, jQuery, or other frameworks.

---

## Backend

* FastAPI
* SQLAlchemy ORM
* SQLite
* Pydantic
* Uvicorn
* Python 3.12+

---

# 3. Project Structure

```
todo-app/
│
├── backend/
│   ├── app/
│   │
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── crud.py
│   ├── config.py
│   ├── __init__.py
│   │
│   ├── requirements.txt
│   └── todo.db
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── assets/
│
└── README.md
```

---

# 4. Design Philosophy

The application should feel:

* Modern
* Friendly
* Colorful
* Smooth
* Minimal
* Professional

Avoid plain white pages.

Avoid Bootstrap styling.

Avoid square buttons.

Everything should feel polished.

---

# 5. Color Palette

Background

```
Gradient

from-violet-100
via-sky-100
to-cyan-100
```

Primary

```
Indigo-600
```

Accent

```
Sky-500
```

Success

```
Emerald-500
```

Warning

```
Amber-500
```

Danger

```
Rose-500
```

Cards

```
White
80% opacity
Backdrop blur
```

---

# 6. Typography

Google Font

```
Inter
```

Heading

```
700 weight
```

Body

```
400
```

Subtitle

```
500
```

Rounded design language

Large spacing

Soft shadows

---

# 7. Layout

Maximum Width

```
900px
```

Centered horizontally.

Generous padding.

Desktop

```
Centered container
```

Tablet

```
Responsive cards
```

Mobile

```
Everything stacks vertically.
```

---

# 8. Home Screen Layout

```
------------------------------------------------

            ✨ My Tasks

     Stay productive today.

[ Motivational Quote ]

------------------------------------------------

Search Tasks

------------------------------------------------

Task Form

Title

Description

[ Add Task ]

------------------------------------------------

Statistics Cards

All

Active

Completed

------------------------------------------------

Progress Bar

65% Complete

------------------------------------------------

Filter Buttons

All

Active

Completed

------------------------------------------------

Task Cards

------------------------------------------------
```

---

# 9. Random Motivational Quote

Display one random quote each time the page loads.

Examples:

```
🚀 One task at a time.

🌟 Small progress is still progress.

💪 Focus on what matters.

🔥 Make today count.

🎯 Done is better than perfect.

✨ Progress beats perfection.
```

---

# 10. Statistics Cards

Three cards.

```
-----------------
All Tasks

12
-----------------

-----------------
Active

5
-----------------

-----------------
Completed

7
-----------------
```

Cards should animate when values change.

---

# 11. Progress Bar

Below statistics.

Example

```
████████░░░░░░░

60% Complete
```

Animated width.

Automatically recalculated.

---

# 12. Task Creation Form

Fields

### Title

Required

Maximum

100 characters

---

### Description

Optional

Maximum

500 characters

---

Button

```
+ Add Task
```

Validation

* Title required
* Trim whitespace
* Disable button while submitting

On success

* Clear inputs
* Reload task list
* Show toast
* Animate new card

---

# 13. Todo Card Design

Each task is displayed as an elevated floating card.

Contents

```
Checkbox

Title

Description

Created Date

Edit Button

Delete Button
```

Completed task

* Green accent border
* Green checkbox
* Strike-through title
* Slightly faded

Hover

* Lift
* Shadow increase
* Slight scale

---

# 14. CRUD Operations

## Create

POST

```
/todos
```

Creates a new task.

---

## Read

GET

```
/todos
```

Returns all tasks.

Newest first.

---

## Update

PUT

```
/todos/{id}
```

Updates

* title
* description
* completed

---

## Delete

DELETE

```
/todos/{id}
```

Deletes task.

Confirmation modal required.

---

# 15. Edit Modal

Centered modal.

Dark blurred backdrop.

Fields

Title

Description

Completed checkbox

Buttons

```
Cancel

Save Changes
```

Animated open/close.

---

# 16. Delete Confirmation

```
Delete Task?

This action cannot be undone.

Cancel

Delete
```

Delete button

Red

Card animates out before removal.

---

# 17. Search

Live filtering.

No button.

Filters

* title
* description

Instant results.

---

# 18. Filter Buttons

Pill buttons.

```
All

Active

Completed
```

Active button

Filled.

Inactive

Outlined.

---

# 19. Empty State

Instead of plain text

```
📝

Nothing here yet!

Create your first task.

[ Add First Task ]
```

Centered.

---

# 20. Loading State

Do NOT use a spinner.

Instead

Display

Three animated skeleton cards.

---

# 21. Toast Notifications

Top right.

Examples

```
✅ Task Added

✏️ Task Updated

🗑 Task Deleted

❌ Something went wrong
```

Disappear after 3 seconds.

---

# 22. Animations

Use Tailwind transitions throughout.

Examples

* Card fade in
* Card fade out
* Button hover
* Modal open
* Checkbox toggle
* Progress bar animation
* Statistics number animation

Duration

```
200–300ms
```

---

# 23. Dark Mode

Add a toggle in the header.

Persist using Local Storage.

Remember user's preference.

---

# 24. Keyboard Support

Enter

Create task.

Escape

Close modal.

Tab

Proper navigation.

---

# 25. Confetti Celebration

When all tasks become completed

Trigger

Small confetti animation.

Only once until another task becomes active.

---

# 26. Database Schema

Todo

| Field       | Type        |
| ----------- | ----------- |
| id          | Integer     |
| title       | String(100) |
| description | String(500) |
| completed   | Boolean     |
| created_at  | DateTime    |
| updated_at  | DateTime    |

---

# 27. Backend API

## GET

```
/todos
```

Returns

```json
[
  {
    "id": 1,
    "title": "Learn FastAPI",
    "description": "Complete CRUD",
    "completed": false,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

---

## GET

```
/todos/{id}
```

Returns one task.

404 if missing.

---

## POST

```
/todos
```

Body

```json
{
    "title":"Learn FastAPI",
    "description":"Finish backend"
}
```

Returns

```
201 Created
```

---

## PUT

```
/todos/{id}
```

Body

```json
{
    "title":"Updated",
    "description":"Updated",
    "completed":true
}
```

---

## DELETE

```
/todos/{id}
```

Returns

```
204 No Content
```

---

# 28. Backend Requirements

* Enable CORS for the frontend origin.
* Use SQLAlchemy ORM.
* Use Pydantic models for request and response validation.
* Separate database logic from API routes.
* Use dependency injection for database sessions.
* Include proper HTTP status codes and error responses.
* Add type hints and docstrings for public functions.

---

# 29. Frontend JavaScript Structure

Organize logic into reusable functions:

```javascript
loadTodos()
renderTodos()
createTodo()
updateTodo()
deleteTodo()
toggleCompleted()
filterTodos()
searchTodos()
showToast()
showLoading()
hideLoading()
showEmptyState()
openEditModal()
closeEditModal()
updateStatistics()
updateProgressBar()
toggleDarkMode()
triggerConfetti()
```

Use `async/await` for all asynchronous operations. Avoid global variables where possible.

---

# 30. Error Handling

Handle gracefully:

* Network failures
* Backend unavailable
* Invalid input
* Task not found
* Unexpected server errors

Display user-friendly messages through toast notifications or inline feedback. Never expose stack traces or raw exception messages.

---

# 31. Responsive Design

### Desktop (≥1024px)

* Centered layout (max-width: 900px)
* Statistics cards in one row
* Spacious task cards

### Tablet (768–1023px)

* Responsive spacing
* Two-column statistics if needed
* Full-width task cards

### Mobile (<768px)

* Single-column layout
* Full-width buttons
* Touch-friendly controls
* Optimized spacing and typography

---

# 32. Stretch Features (Optional)

If time permits, consider adding:

* Priority levels (Low, Medium, High) with colored badges.
* Due dates with color-coded urgency ("Today", "Tomorrow", overdue).
* Drag-and-drop task reordering (frontend only).
* Sort by newest, oldest, alphabetical, or completion status.
* Local storage caching for offline viewing.
* Export/import tasks as JSON.

---

# 33. Non-Functional Requirements

* Clean, modular, and maintainable code.
* Consistent naming conventions.
* Semantic HTML and basic accessibility (labels, focus states, keyboard navigation).
* Responsive performance with smooth interactions.
* Clear README with setup instructions.

---

# 34. Acceptance Criteria

The project is considered complete when:

* ✅ Full CRUD operations work end-to-end with FastAPI and SQLite.
* ✅ The frontend communicates exclusively with the backend via REST APIs (`fetch()`).
* ✅ Users can create, view, edit, delete, search, filter, and complete tasks.
* ✅ The UI is responsive, modern, and visually polished.
* ✅ Loading, empty, success, and error states are implemented.
* ✅ Dark mode persists across sessions.
* ✅ Animations enhance the experience without being distracting.
* ✅ Code is modular, documented, and follows good engineering practices.
* ✅ The application can be run locally with `uvicorn` for the backend and any static server for the frontend.

## Overall Goal

The finished application should feel like a **production-ready personal productivity app** rather than a simple CRUD demo. It should be something you'd be comfortable showcasing in a portfolio, demonstrating both backend API development and thoughtful frontend design.


# 35. AI Assistant (Agentic Loop)

## Overview

Add an AI assistant that can understand natural language requests and manipulate todos using **Anthropic's Messages API with tool calling**.

The assistant should operate in an **agentic loop**, where it:

1. Receives a user request.
2. Decides whether it needs to call a tool.
3. Calls one or more backend tools.
4. Receives tool results.
5. Continues reasoning if needed.
6. Produces a final response.

The implementation should follow Anthropic's recommended tool-use pattern.

---

# UI

A floating AI panel should appear in the **bottom-right corner** of the application.

Think of it like:

* ChatGPT
* Intercom
* GitHub Copilot Chat

The panel should not interfere with the main Todo interface.

Example:

```
┌────────────────────────────┐
│ 🤖 AI Assistant            │
├────────────────────────────┤
│                            │
│ I'll help manage your      │
│ tasks.                     │
│                            │
│ You: Add homework          │
│                            │
│ AI: Done!                  │
│                            │
├────────────────────────────┤
│ Type a message...          │
│                    [Send]   │
└────────────────────────────┘
```

---

# Example Prompts

Users should be able to type:

```
Add a todo called Buy groceries
```

```
Remind me to study machine learning tomorrow
```

```
Delete every completed task
```

```
Rename "Homework" to "Math Homework"
```

```
Mark everything completed
```

```
What tasks do I have left?
```

```
Create five tasks for my vacation planning
```

```
Show my completed tasks
```

```
Delete the oldest task
```

The AI should determine which tools to call without the frontend needing to parse the request.

---

# Backend Architecture

The backend should expose a dedicated endpoint:

```
POST /agent/chat
```

The frontend only communicates with this endpoint for AI interactions.

---

# Agent Loop

The backend should implement the following loop:

```
User Message

↓

Anthropic Messages API

↓

Claude decides whether to use tools

↓

Execute tool

↓

Return tool result

↓

Claude continues reasoning

↓

Repeat if more tools required

↓

Return final response
```

Continue looping until the model returns a normal assistant message with no further tool requests.

---

# Anthropic Tool Definitions

Provide the model with structured tool definitions for:

## create_todo

Parameters

```
title

description
```

---

## update_todo

Parameters

```
id

title

description

completed
```

All update fields except `id` should be optional so the model can change only what is needed.

---

## delete_todo

Parameters

```
id
```

---

## list_todos

Returns every task.

Useful for answering questions like:

```
What do I still need to do?
```

---

## get_todo

Parameters

```
id
```

---

## search_todos

Parameters

```
query
```

Searches title and description.

---

# Optional Tool

## delete_completed

Deletes every completed task.

Useful for

```
Delete everything I've already finished.
```

---

# Agent Prompt

The system prompt should clearly instruct the model to:

* Manage the user's todo list.
* Use tools whenever data needs to be read or modified.
* Never invent task IDs or task contents.
* Ask for clarification if a request is ambiguous (e.g., multiple tasks with the same title).
* Keep responses concise and friendly.
* Confirm successful actions.

---

# Tool Execution

The backend should execute tools by calling the existing CRUD functions directly, rather than making HTTP requests to its own API.

For example:

```
Claude

↓

tool_use

↓

crud.create_todo()

↓

Result

↓

Claude
```

This keeps the implementation efficient and avoids unnecessary network calls.

---

# Frontend Chat

The chat window should support:

* Conversation history (current session only)
* Auto-scroll to the latest message
* Loading indicator while the AI is thinking
* Distinct styling for user and assistant messages
* Optional display of tool activity (e.g., "Creating task...", "Updating task...")

---

# Synchronization

Whenever the AI creates, updates, or deletes tasks, the main Todo list should refresh automatically so the UI always reflects the current state.

---

# Suggested Tool Schema

The agent should have access to tools similar to:

```json
[
  {
    "name": "create_todo",
    "description": "Create a new todo item."
  },
  {
    "name": "update_todo",
    "description": "Update an existing todo."
  },
  {
    "name": "delete_todo",
    "description": "Delete a todo."
  },
  {
    "name": "list_todos",
    "description": "List all todos."
  },
  {
    "name": "search_todos",
    "description": "Search todos."
  }
]
```

The exact input schemas should follow Anthropic's current tool-use specification.

---

# Conversation Examples

### Example 1

**User**

> Add a task to buy milk tomorrow.

**Claude**

* Calls `create_todo`

**Assistant**

> Done! I've added **Buy milk tomorrow** to your task list.

---

### Example 2

**User**

> Mark everything completed.

Claude:

1. Calls `list_todos`
2. Calls `update_todo` for each incomplete task
3. Returns a confirmation.

---

### Example 3

**User**

> Delete all completed tasks.

Claude:

1. Calls `list_todos`
2. Calls `delete_todo` for each completed task (or `delete_completed` if implemented)
3. Returns the number of deleted tasks.

---

### Example 4

**User**

> What do I still need to do today?

Claude:

1. Calls `list_todos`
2. Filters incomplete tasks
3. Responds with a concise summary.

---

# Configuration

Store the Anthropic API key in an environment variable:

```text
ANTHROPIC_API_KEY=your_api_key_here
```

Do not hardcode secrets in the codebase.

---

# Acceptance Criteria (AI)

The AI assistant is considered complete when:

* ✅ A floating chat widget is available from any point in the application.
* ✅ Natural language requests are interpreted using Anthropic's Messages API.
* ✅ The backend implements a proper agentic loop that continues until no more tool calls are requested.
* ✅ CRUD operations invoked by the AI reuse the existing backend business logic.
* ✅ The main Todo list updates immediately after AI-driven changes.
* ✅ The assistant can perform multi-step tasks (e.g., list → update → summarize).
* ✅ Ambiguous requests are handled by asking clarifying questions instead of guessing.
* ✅ Errors from tool execution are reported gracefully to the user.

This AI assistant elevates the project from a standard CRUD application to an intelligent productivity tool, showcasing not only frontend and backend development but also practical LLM integration with structured tool use and agentic workflows.
