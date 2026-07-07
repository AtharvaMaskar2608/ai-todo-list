from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import Todo
from app.routers.todos import router


@pytest.fixture
def client() -> Iterator[TestClient]:
    """A TestClient wired to an isolated in-memory SQLite via get_db override."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False)

    def _override_get_db() -> Iterator[Session]:
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as test_client:
        test_client.engine = engine  # exposed for direct-insert helpers
        test_client.session_factory = TestingSession
        yield test_client

    engine.dispose()


def _seed(client: TestClient, title: str, created_at: datetime) -> int:
    """Insert a Todo directly with an explicit created_at for ordering tests."""
    db = client.session_factory()
    try:
        todo = Todo(title=title, created_at=created_at, updated_at=created_at)
        db.add(todo)
        db.commit()
        db.refresh(todo)
        return todo.id
    finally:
        db.close()


# --- GET /todos -------------------------------------------------------------


def test_list_empty_returns_200_empty_array(client: TestClient) -> None:
    resp = client.get("/todos")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_returns_200_newest_first(client: TestClient) -> None:
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    _seed(client, "oldest", base)
    _seed(client, "middle", base + timedelta(hours=1))
    _seed(client, "newest", base + timedelta(hours=2))

    resp = client.get("/todos")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert titles == ["newest", "middle", "oldest"]


# --- GET /todos/{id} --------------------------------------------------------


def test_get_by_id_returns_200_when_exists(client: TestClient) -> None:
    created = client.post("/todos", json={"title": "Find me"}).json()

    resp = client.get(f"/todos/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Find me"


def test_get_by_id_returns_404_when_missing(client: TestClient) -> None:
    resp = client.get("/todos/999")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Todo not found"}


# --- POST /todos ------------------------------------------------------------


def test_create_returns_201_with_defaults(client: TestClient) -> None:
    resp = client.post(
        "/todos", json={"title": "Write API", "description": "the router"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] is not None
    assert body["title"] == "Write API"
    assert body["description"] == "the router"
    assert body["completed"] is False
    assert body["created_at"] is not None
    assert body["updated_at"] is not None


def test_create_rejects_invalid_body_with_422(client: TestClient) -> None:
    resp = client.post("/todos", json={"title": "   "})
    assert resp.status_code == 422
    assert client.get("/todos").json() == []


# --- PUT /todos/{id} --------------------------------------------------------


def test_update_partial_returns_200(client: TestClient) -> None:
    created = client.post(
        "/todos", json={"title": "Original", "description": "keep me"}
    ).json()

    resp = client.put(f"/todos/{created['id']}", json={"completed": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["completed"] is True
    assert body["title"] == "Original"
    assert body["description"] == "keep me"


def test_update_missing_returns_404(client: TestClient) -> None:
    resp = client.put("/todos/999", json={"completed": True})
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Todo not found"}


def test_update_invalid_body_returns_422(client: TestClient) -> None:
    created = client.post("/todos", json={"title": "Original"}).json()

    resp = client.put(f"/todos/{created['id']}", json={"title": "x" * 101})
    assert resp.status_code == 422
    assert client.get(f"/todos/{created['id']}").json()["title"] == "Original"


# --- DELETE /todos/{id} -----------------------------------------------------


def test_delete_returns_204_empty_body(client: TestClient) -> None:
    created = client.post("/todos", json={"title": "Delete me"}).json()

    resp = client.delete(f"/todos/{created['id']}")
    assert resp.status_code == 204
    assert resp.content == b""
    assert client.get(f"/todos/{created['id']}").status_code == 404


def test_delete_missing_returns_404(client: TestClient) -> None:
    resp = client.delete("/todos/999")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Todo not found"}
