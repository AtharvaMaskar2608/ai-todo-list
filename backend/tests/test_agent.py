"""Tests for the agentic chat loop and endpoint, driven by a mocked Anthropic
client — no real API calls are made.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import crud
from app.agent import loop as agent_loop
from app.agent.loop import MAX_ITERATIONS, run_agent
from app.database import Base, get_db
from app.routers import agent as agent_router
from app.schemas import TodoCreate


# --- Fake Anthropic response builders ---------------------------------------


def _text_block(text):
    return SimpleNamespace(type="text", text=text)


def _tool_use_block(block_id, name, tool_input):
    return SimpleNamespace(type="tool_use", id=block_id, name=name, input=tool_input)


def _response(content, stop_reason):
    return SimpleNamespace(content=content, stop_reason=stop_reason)


class _FakeMessages:
    """Returns queued responses in order; repeats the last once exhausted."""

    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if len(self._responses) > 1:
            return self._responses.pop(0)
        return self._responses[0]


class FakeClient:
    def __init__(self, responses):
        self.messages = _FakeMessages(responses)


# --- Fixtures ----------------------------------------------------------------


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


def _user(content):
    return {"role": "user", "content": content}


# --- 6.1 End-to-end create + list flow ---------------------------------------


def test_create_then_list_flow_returns_reply_ordered_activity_and_changed(db):
    client = FakeClient(
        [
            _response(
                [_tool_use_block("t1", "create_todo", {"title": "Buy milk"})],
                "tool_use",
            ),
            _response(
                [_tool_use_block("t2", "list_todos", {})],
                "tool_use",
            ),
            _response(
                [_text_block("Added 'Buy milk'. You have 1 todo.")],
                "end_turn",
            ),
        ]
    )

    result = run_agent(db, [_user("add buy milk then show my list")], client=client)

    assert result["reply"] == "Added 'Buy milk'. You have 1 todo."
    assert result["tool_activity"] == [
        {"tool": "create_todo", "summary": "Created 'Buy milk'"},
        {"tool": "list_todos", "summary": "Listed 1 todo(s)"},
    ]
    assert result["todos_changed"] is True
    # The tool actually ran against the db.
    assert [t.title for t in crud.list_todos(db)] == ["Buy milk"]
    # Three model turns: create, list, final.
    assert len(client.messages.calls) == 3


# --- 6.2 Safeguards ----------------------------------------------------------


def test_missing_api_key_returns_503(monkeypatch):
    monkeypatch.setattr(
        agent_router,
        "get_settings",
        lambda: SimpleNamespace(ANTHROPIC_API_KEY=""),
    )

    app = FastAPI()
    app.include_router(agent_router.router)
    app.dependency_overrides[get_db] = lambda: None

    with TestClient(app) as tc:
        resp = tc.post("/agent/chat", json={"messages": [_user("hi")]})

    assert resp.status_code == 503
    assert resp.json() == {"detail": "AI assistant not configured"}


def test_endpoint_returns_contract_shape(db, monkeypatch):
    monkeypatch.setattr(
        agent_router,
        "get_settings",
        lambda: SimpleNamespace(ANTHROPIC_API_KEY="test-key"),
    )
    client = FakeClient([_response([_text_block("Hi! How can I help?")], "end_turn")])
    monkeypatch.setattr(agent_loop, "_build_client", lambda: client)

    app = FastAPI()
    app.include_router(agent_router.router)
    app.dependency_overrides[get_db] = lambda: db

    with TestClient(app) as tc:
        resp = tc.post("/agent/chat", json={"messages": [_user("hi")]})

    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Hi! How can I help?"
    assert body["tool_activity"] == []
    assert body["todos_changed"] is False


def test_graceful_tool_error_on_missing_id_does_not_flip_changed(db):
    client = FakeClient(
        [
            _response(
                [_tool_use_block("t1", "update_todo", {"id": 999, "completed": True})],
                "tool_use",
            ),
            _response(
                [_text_block("I couldn't find that todo. Which one did you mean?")],
                "end_turn",
            ),
        ]
    )

    result = run_agent(db, [_user("mark todo 999 done")], client=client)

    assert result["reply"] == "I couldn't find that todo. Which one did you mean?"
    assert len(result["tool_activity"]) == 1
    assert result["tool_activity"][0]["tool"] == "update_todo"
    assert "No todo found with id 999" in result["tool_activity"][0]["summary"]
    # A failing mutating tool must not flip todos_changed.
    assert result["todos_changed"] is False


def test_read_only_request_leaves_todos_changed_false(db):
    crud.create_todo(db, TodoCreate(title="Existing task"))
    client = FakeClient(
        [
            _response([_tool_use_block("t1", "list_todos", {})], "tool_use"),
            _response([_text_block("You have 1 task left.")], "end_turn"),
        ]
    )

    result = run_agent(db, [_user("what's left?")], client=client)

    assert result["reply"] == "You have 1 task left."
    assert result["tool_activity"] == [
        {"tool": "list_todos", "summary": "Listed 1 todo(s)"}
    ]
    assert result["todos_changed"] is False


def test_max_iteration_cap_terminates_with_fallback(db):
    # Model that never stops requesting tools.
    client = FakeClient(
        [_response([_tool_use_block("t", "list_todos", {})], "tool_use")]
    )

    result = run_agent(db, [_user("loop forever")], client=client)

    assert len(client.messages.calls) == MAX_ITERATIONS
    assert result["reply"]  # non-empty fallback
    assert len(result["tool_activity"]) == MAX_ITERATIONS
