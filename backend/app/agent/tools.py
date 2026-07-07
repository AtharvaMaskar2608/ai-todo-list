"""Anthropic tool definitions and their dispatch to ``crud.*`` business logic.

``TOOL_DEFS`` is the list of Anthropic tool schemas passed to
``messages.create(tools=...)``. ``execute_tool`` runs a single requested tool
against a database ``Session`` by calling the matching ``crud.*`` function
directly — never via a self-HTTP request — and returns a ``(result, is_error)``
pair the loop feeds back to the model as a ``tool_result`` block.
"""

import json

from sqlalchemy.orm import Session

from app import crud
from app.models import Todo
from app.schemas import TodoCreate, TodoUpdate

# Tools that change persisted state. A successful call to any of these flips the
# turn's ``todos_changed`` flag; read-only tools never do.
MUTATING_TOOLS = frozenset(
    {"create_todo", "update_todo", "delete_todo", "delete_completed"}
)

TOOL_DEFS = [
    {
        "name": "create_todo",
        "description": "Create a new todo with a title and an optional description.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short title of the todo (1-100 chars).",
                },
                "description": {
                    "type": "string",
                    "description": "Optional longer description (up to 500 chars).",
                },
            },
            "required": ["title"],
        },
    },
    {
        "name": "update_todo",
        "description": (
            "Update an existing todo by id. Only the provided fields change; "
            "use this to rename, edit the description, or mark complete/incomplete."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Id of the todo to update."},
                "title": {"type": "string", "description": "New title."},
                "description": {"type": "string", "description": "New description."},
                "completed": {
                    "type": "boolean",
                    "description": "Whether the todo is completed.",
                },
            },
            "required": ["id"],
        },
    },
    {
        "name": "delete_todo",
        "description": "Delete a single todo by id.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Id of the todo to delete."},
            },
            "required": ["id"],
        },
    },
    {
        "name": "list_todos",
        "description": "List all todos, newest first. Use before mutating to find ids.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_todo",
        "description": "Fetch a single todo by id.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Id of the todo to fetch."},
            },
            "required": ["id"],
        },
    },
    {
        "name": "search_todos",
        "description": (
            "Case-insensitive search over todo title and description; returns "
            "matching todos newest first."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Text to search for."},
            },
            "required": ["query"],
        },
    },
    {
        "name": "delete_completed",
        "description": "Delete every completed todo. Returns how many were removed.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


def _todo_dict(todo: Todo) -> dict:
    """Serialize a Todo to a compact JSON-friendly dict for the model."""
    return {
        "id": todo.id,
        "title": todo.title,
        "description": todo.description,
        "completed": todo.completed,
    }


def _create_todo(db: Session, tool_input: dict) -> tuple[str, bool]:
    data = TodoCreate(
        title=tool_input.get("title"),
        description=tool_input.get("description"),
    )
    todo = crud.create_todo(db, data)
    return json.dumps(_todo_dict(todo)), False


def _update_todo(db: Session, tool_input: dict) -> tuple[str, bool]:
    todo_id = tool_input.get("id")
    fields = {k: tool_input[k] for k in ("title", "description", "completed") if k in tool_input}
    data = TodoUpdate(**fields)
    todo = crud.update_todo(db, todo_id, data)
    if todo is None:
        return f"No todo found with id {todo_id}.", True
    return json.dumps(_todo_dict(todo)), False


def _delete_todo(db: Session, tool_input: dict) -> tuple[str, bool]:
    todo_id = tool_input.get("id")
    if crud.delete_todo(db, todo_id):
        return json.dumps({"deleted_id": todo_id}), False
    return f"No todo found with id {todo_id}.", True


def _list_todos(db: Session, tool_input: dict) -> tuple[str, bool]:
    todos = crud.list_todos(db)
    return json.dumps([_todo_dict(t) for t in todos]), False


def _get_todo(db: Session, tool_input: dict) -> tuple[str, bool]:
    todo_id = tool_input.get("id")
    todo = crud.get_todo(db, todo_id)
    if todo is None:
        return f"No todo found with id {todo_id}.", True
    return json.dumps(_todo_dict(todo)), False


def _search_todos(db: Session, tool_input: dict) -> tuple[str, bool]:
    todos = crud.search_todos(db, tool_input.get("query", ""))
    return json.dumps([_todo_dict(t) for t in todos]), False


def _delete_completed(db: Session, tool_input: dict) -> tuple[str, bool]:
    count = crud.delete_completed(db)
    return json.dumps({"deleted_count": count}), False


_HANDLERS = {
    "create_todo": _create_todo,
    "update_todo": _update_todo,
    "delete_todo": _delete_todo,
    "list_todos": _list_todos,
    "get_todo": _get_todo,
    "search_todos": _search_todos,
    "delete_completed": _delete_completed,
}


def execute_tool(db: Session, name: str, tool_input: dict) -> tuple[str, bool]:
    """Dispatch one tool call to ``crud.*`` and return ``(result, is_error)``.

    ``result`` is a string suitable as a ``tool_result`` content: JSON on success,
    or an informative message when ``is_error`` is ``True``. Not-found targets and
    any raised exception are reported as errors (``is_error=True``) so the loop can
    continue and the model can recover or ask, rather than the request aborting.
    """
    handler = _HANDLERS.get(name)
    if handler is None:
        return f"Unknown tool: {name}", True
    try:
        return handler(db, tool_input or {})
    except Exception as exc:  # noqa: BLE001 - report any failure back to the model
        return f"Tool '{name}' failed: {exc}", True
