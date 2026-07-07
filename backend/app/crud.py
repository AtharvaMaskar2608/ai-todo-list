from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.models import Todo
from app.schemas import TodoCreate, TodoUpdate


def list_todos(db: Session) -> list[Todo]:
    """Return all todos ordered by created_at descending (newest first)."""
    stmt = select(Todo).order_by(Todo.created_at.desc())
    return list(db.scalars(stmt).all())


def get_todo(db: Session, todo_id: int) -> Todo | None:
    """Return the todo with the given id, or None if it does not exist."""
    return db.get(Todo, todo_id)


def create_todo(db: Session, data: TodoCreate) -> Todo:
    """Persist a new todo and return it with populated id and timestamps."""
    todo = Todo(title=data.title, description=data.description)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def update_todo(db: Session, todo_id: int, data: TodoUpdate) -> Todo | None:
    """Apply only the provided fields to a todo; return it, or None if missing."""
    todo = db.get(Todo, todo_id)
    if todo is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(todo, field, value)
    db.commit()
    db.refresh(todo)
    return todo


def delete_todo(db: Session, todo_id: int) -> bool:
    """Delete a todo; return True if a row was removed, False if id was missing."""
    todo = db.get(Todo, todo_id)
    if todo is None:
        return False
    db.delete(todo)
    db.commit()
    return True


def search_todos(db: Session, query: str) -> list[Todo]:
    """Case-insensitive search over title OR description, newest-first."""
    pattern = f"%{query}%"
    stmt = (
        select(Todo)
        .where(
            or_(
                Todo.title.ilike(pattern),
                Todo.description.ilike(pattern),
            )
        )
        .order_by(Todo.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def delete_completed(db: Session) -> int:
    """Delete every completed todo and return the number of rows deleted."""
    result = db.execute(delete(Todo).where(Todo.completed.is_(True)))
    db.commit()
    return result.rowcount or 0
