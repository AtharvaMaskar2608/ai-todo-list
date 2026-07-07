from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import crud
from app.database import Base
from app.models import Todo
from app.schemas import TodoCreate, TodoUpdate


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _make(db, title, description=None, completed=False, created_at=None):
    """Insert a Todo directly, allowing an explicit created_at for ordering tests."""
    todo = Todo(title=title, description=description, completed=completed)
    if created_at is not None:
        todo.created_at = created_at
        todo.updated_at = created_at
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def test_create_todo_persists_with_id_and_timestamps(db):
    todo = crud.create_todo(db, TodoCreate(title="Write tests"))
    assert todo.id is not None
    assert todo.created_at is not None
    assert todo.updated_at is not None
    assert todo.completed is False


def test_list_todos_newest_first(db):
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    _make(db, "oldest", created_at=base)
    _make(db, "middle", created_at=base + timedelta(hours=1))
    _make(db, "newest", created_at=base + timedelta(hours=2))

    titles = [t.title for t in crud.list_todos(db)]
    assert titles == ["newest", "middle", "oldest"]


def test_get_todo_missing_returns_none(db):
    assert crud.get_todo(db, 999) is None


def test_update_todo_partial_changes_only_provided_fields(db):
    todo = crud.create_todo(
        db, TodoCreate(title="Original", description="keep me")
    )
    updated = crud.update_todo(db, todo.id, TodoUpdate(completed=True))

    assert updated is not None
    assert updated.completed is True
    assert updated.title == "Original"
    assert updated.description == "keep me"


def test_update_todo_missing_returns_none(db):
    assert crud.update_todo(db, 999, TodoUpdate(completed=True)) is None


def test_delete_todo_true_then_false(db):
    todo = crud.create_todo(db, TodoCreate(title="Delete me"))
    assert crud.delete_todo(db, todo.id) is True
    assert crud.delete_todo(db, todo.id) is False


def test_search_todos_case_insensitive_title_or_description(db):
    _make(db, "Buy MILK", description="from the store")
    _make(db, "Read book", description="about MILKing cows")
    _make(db, "Unrelated", description="nothing here")

    results = crud.search_todos(db, "milk")
    titles = {t.title for t in results}
    assert titles == {"Buy MILK", "Read book"}


def test_delete_completed_returns_count(db):
    _make(db, "done 1", completed=True)
    _make(db, "done 2", completed=True)
    _make(db, "done 3", completed=True)
    _make(db, "active 1", completed=False)
    _make(db, "active 2", completed=False)

    assert crud.delete_completed(db) == 3
    remaining = {t.title for t in crud.list_todos(db)}
    assert remaining == {"active 1", "active 2"}


def test_delete_completed_none_returns_zero(db):
    _make(db, "active", completed=False)
    assert crud.delete_completed(db) == 0
