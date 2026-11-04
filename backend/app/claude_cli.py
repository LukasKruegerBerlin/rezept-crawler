"""Headless Claude Code CLI calls on the Claude Pro subscription."""

import asyncio
import json
import os
import tempfile
from typing import Any

# Either variable would make the CLI bill the API instead of the subscription.
API_CREDENTIAL_VARS = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")


class ClaudeCliError(Exception):
    """The CLI is missing, timed out, failed, or returned unusable output."""


async def run_claude(
    *,
    model: str,
    system_prompt: str,
    schema: dict[str, Any],
    payload: Any,
    timeout: float,
) -> Any:
    """Send ``payload`` as JSON on stdin and return the schema-shaped output."""
    env = {k: v for k, v in os.environ.items() if k not in API_CREDENTIAL_VARS}
    try:
        process = await asyncio.create_subprocess_exec(
            "claude",
            "-p",
            "--model",
            model,
            "--output-format",
            "json",
            "--json-schema",
            json.dumps(schema),
            "--system-prompt",
            system_prompt,
            "--tools",
            "",
            "--no-session-persistence",
            "--setting-sources",
            "",
            "--strict-mcp-config",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
            # Outside the repo, so no project CLAUDE.md is loaded into the prompt.
            cwd=tempfile.gettempdir(),
        )
    except OSError as exc:
        raise ClaudeCliError from exc

    try:
        stdout, _ = await asyncio.wait_for(
            process.communicate(json.dumps(payload, ensure_ascii=False).encode()),
            timeout,
        )
    except TimeoutError as exc:
        process.kill()
        await process.wait()
        raise ClaudeCliError from exc

    if process.returncode != 0:
        raise ClaudeCliError
    try:
        result = json.loads(stdout)
        output = result["structured_output"]
    except (ValueError, KeyError, TypeError) as exc:
        raise ClaudeCliError from exc
    if result.get("is_error") or result.get("subtype") != "success":
        raise ClaudeCliError
    return output
