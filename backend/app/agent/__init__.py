"""Agent package: the AI todo assistant's tool-use loop, tools, and prompt.

Public surface:
- ``run_agent`` — the stateless agentic loop over Anthropic's Messages API.
- ``TOOL_DEFS`` / ``execute_tool`` — Anthropic tool schemas and their CRUD dispatch.
- ``SYSTEM_PROMPT`` — the instructions that govern the assistant's behaviour.
"""

from app.agent.loop import run_agent
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import TOOL_DEFS, execute_tool

__all__ = ["run_agent", "SYSTEM_PROMPT", "TOOL_DEFS", "execute_tool"]
