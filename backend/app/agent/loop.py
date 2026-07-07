"""The stateless agentic tool-use loop over Anthropic's Messages API.

``run_agent`` rebuilds the Anthropic conversation from the supplied ``messages``
each call (the server holds no state), then loops: ask the model, and while it
returns ``stop_reason == "tool_use"`` execute every requested tool via
``execute_tool`` and feed the results back as a single ``tool_result`` message.
It stops on a normal assistant message (returned as ``reply``) or at
``MAX_ITERATIONS``. It also reports ``tool_activity`` (ordered, human-readable)
and ``todos_changed`` (``True`` iff a mutating tool ran successfully).
"""

import json

import anthropic
from sqlalchemy.orm import Session

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import MUTATING_TOOLS, TOOL_DEFS, execute_tool
from app.config import get_settings

# Cap the tool-use loop so a model that never stops requesting tools cannot loop
# forever; on hitting the cap we return a safe fallback rather than call tools on.
MAX_ITERATIONS = 10
MAX_TOKENS = 2048

_MAX_ITER_REPLY = (
    "I wasn't able to finish that request. Please try rephrasing it or breaking "
    "it into smaller steps."
)


def _build_client() -> anthropic.Anthropic:
    """Construct an Anthropic client, keyed from configuration."""
    settings = get_settings()
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY or None)


def _extract_text(content) -> str:
    """Join the text of every ``text`` block in an assistant message."""
    parts = [
        block.text
        for block in content
        if getattr(block, "type", None) == "text"
    ]
    return "".join(parts).strip()


def _load(result: str):
    """Parse a tool result string as JSON, or return ``None`` on failure."""
    try:
        return json.loads(result)
    except (ValueError, TypeError):
        return None


def _summarize(name: str, tool_input: dict, result: str, is_error: bool) -> str:
    """Build a short human-readable summary of one executed tool."""
    if is_error:
        return result
    parsed = _load(result)
    if name == "create_todo":
        title = parsed.get("title") if isinstance(parsed, dict) else None
        return f"Created '{title or tool_input.get('title', '')}'"
    if name == "update_todo":
        title = parsed.get("title") if isinstance(parsed, dict) else None
        return f"Updated '{title}'" if title else f"Updated todo {tool_input.get('id')}"
    if name == "delete_todo":
        return f"Deleted todo {tool_input.get('id')}"
    if name == "list_todos":
        count = len(parsed) if isinstance(parsed, list) else 0
        return f"Listed {count} todo(s)"
    if name == "get_todo":
        return f"Fetched todo {tool_input.get('id')}"
    if name == "search_todos":
        count = len(parsed) if isinstance(parsed, list) else 0
        return f"Searched for '{tool_input.get('query', '')}' ({count} match(es))"
    if name == "delete_completed":
        count = parsed.get("deleted_count") if isinstance(parsed, dict) else None
        return f"Deleted {count} completed" if count is not None else "Deleted completed todos"
    return name


def run_agent(db: Session, messages: list[dict], client=None) -> dict:
    """Run the agentic loop and return the contract response dict.

    ``messages`` is the full conversation as ``[{"role", "content"}]`` (the server
    is stateless). ``client`` may be injected for testing; otherwise one is built
    from configuration. Returns ``{"reply", "tool_activity", "todos_changed"}``.
    """
    settings = get_settings()
    if client is None:
        client = _build_client()

    convo: list[dict] = [
        {"role": m["role"], "content": m["content"]} for m in messages
    ]
    tool_activity: list[dict] = []
    todos_changed = False
    reply = ""

    for _ in range(MAX_ITERATIONS):
        resp = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFS,
            messages=convo,
            max_tokens=MAX_TOKENS,
        )

        if resp.stop_reason != "tool_use":
            reply = _extract_text(resp.content)
            break

        # Preserve the assistant turn verbatim (text + tool_use blocks) so the
        # follow-up tool_result blocks reference valid tool_use ids.
        convo.append({"role": "assistant", "content": resp.content})

        tool_results = []
        for block in resp.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            result, is_error = execute_tool(db, block.name, block.input)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                    "is_error": is_error,
                }
            )
            tool_activity.append(
                {
                    "tool": block.name,
                    "summary": _summarize(block.name, block.input, result, is_error),
                }
            )
            if not is_error and block.name in MUTATING_TOOLS:
                todos_changed = True

        # Feed every tool result back as a single user message, then loop.
        convo.append({"role": "user", "content": tool_results})
    else:
        # Loop exhausted without a normal assistant message: fail safe.
        reply = reply or _MAX_ITER_REPLY

    return {
        "reply": reply,
        "tool_activity": tool_activity,
        "todos_changed": todos_changed,
    }
