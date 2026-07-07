"""The ``POST /agent/chat`` endpoint (CONTRACTS §3).

Stateless: the client sends the full conversation each turn. The router validates
the request, fails fast with 503 when no Anthropic key is configured, and
delegates all logic to ``agent.run_agent``.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agent import run_agent
from app.config import get_settings
from app.database import get_db

router = APIRouter(prefix="/agent", tags=["agent"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ToolActivity(BaseModel):
    tool: str
    summary: str


class ChatResponse(BaseModel):
    reply: str
    tool_activity: list[ToolActivity]
    todos_changed: bool


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    """Run the agentic loop over the supplied conversation and return the reply."""
    settings = get_settings()
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI assistant not configured")

    result = run_agent(db, [m.model_dump() for m in request.messages])
    return ChatResponse(**result)
