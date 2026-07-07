from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.schemas import TodoCreate, TodoResponse, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])

_NOT_FOUND = HTTPException(status_code=404, detail="Todo not found")


@router.get("", response_model=list[TodoResponse])
def list_todos(db: Session = Depends(get_db)) -> list:
    """Return all todos newest-first, exactly as ordered by crud.list_todos."""
    return crud.list_todos(db)


@router.get("/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, db: Session = Depends(get_db)):
    """Return one todo, or 404 when it does not exist."""
    todo = crud.get_todo(db, todo_id)
    if todo is None:
        raise _NOT_FOUND
    return todo


@router.post("", response_model=TodoResponse, status_code=201)
def create_todo(data: TodoCreate, db: Session = Depends(get_db)):
    """Create a todo from a validated body and return it with 201."""
    return crud.create_todo(db, data)


@router.put("/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: int, data: TodoUpdate, db: Session = Depends(get_db)):
    """Apply a partial update, or 404 when the todo does not exist."""
    todo = crud.update_todo(db, todo_id, data)
    if todo is None:
        raise _NOT_FOUND
    return todo


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a todo (204, empty body), or 404 when it does not exist."""
    if not crud.delete_todo(db, todo_id):
        raise _NOT_FOUND
