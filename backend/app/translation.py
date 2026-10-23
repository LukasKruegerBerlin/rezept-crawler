"""German <-> English translation via the Claude Code CLI (Claude Pro subscription)."""

import asyncio
import json
import os
import tempfile

MODEL = "haiku"
TIMEOUT_SECONDS = 60.0

# Either variable would make the CLI bill the API instead of the subscription.
API_CREDENTIAL_VARS = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")

OUTPUT_SCHEMA = json.dumps(
    {
        "type": "object",
        "properties": {"translations": {"type": "array", "items": {"type": "string"}}},
        "required": ["translations"],
        "additionalProperties": False,
    }
)

TO_ENGLISH_PROMPT = (
    "You translate German cooking ingredients into English search terms for a "
    "recipe API. The input is a JSON list. Return exactly one short English "
    "ingredient name per input, in the same order. Resolve ambiguous words to "
    'their most likely cooking meaning (for example "Paprika" is "bell pepper", '
    "not the spice)."
)
TO_GERMAN_PROMPT = (
    "You translate English recipe titles and ingredient names into natural German "
    "as used in German cookbooks. The input is a JSON list. Return exactly one "
    "translation per input, in the same order. Keep proper names that have no "
    "German equivalent."
)
TO_GERMAN_RECIPE_PROMPT = (
    "You translate an English recipe into natural German as used in German "
    "cookbooks. The input is a JSON list of recipe titles, ingredient names, "
    'short measurement units (for example "Tbsp" is "EL", "tsp" is "TL") and '
    "cooking steps. Return exactly one translation per input, in the same order. "
    "Translate steps as complete German sentences and keep all numbers, "
    "temperatures and times. Keep proper names that have no German equivalent."
)


class TranslationError(Exception):
    """The CLI failed or returned output that does not match the input."""


async def _translate(system_prompt: str, items: list[str]) -> list[str]:
    env = {k: v for k, v in os.environ.items() if k not in API_CREDENTIAL_VARS}
    try:
        process = await asyncio.create_subprocess_exec(
            "claude",
            "-p",
            "--model",
            MODEL,
            "--output-format",
            "json",
            "--json-schema",
            OUTPUT_SCHEMA,
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
        raise TranslationError from exc

    try:
        stdout, _ = await asyncio.wait_for(
            process.communicate(json.dumps(items, ensure_ascii=False).encode()),
            TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        process.kill()
        await process.wait()
        raise TranslationError from exc

    if process.returncode != 0:
        raise TranslationError
    try:
        result = json.loads(stdout)
        translations = result["structured_output"]["translations"]
    except (ValueError, KeyError, TypeError) as exc:
        raise TranslationError from exc
    if (
        result.get("is_error")
        or result.get("subtype") != "success"
        or not isinstance(translations, list)
        or len(translations) != len(items)
        or not all(isinstance(t, str) for t in translations)
    ):
        raise TranslationError
    return [t.strip() for t in translations]


async def ingredients_to_english(ingredients: list[str]) -> list[str]:
    return await _translate(TO_ENGLISH_PROMPT, ingredients)


async def to_german(texts: list[str]) -> list[str]:
    return await _translate(TO_GERMAN_PROMPT, texts)


async def recipe_to_german(texts: list[str]) -> list[str]:
    return await _translate(TO_GERMAN_RECIPE_PROMPT, texts)
