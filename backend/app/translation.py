"""German <-> English translation via the Claude Code CLI (Claude Pro subscription)."""

from app.claude_cli import ClaudeCliError, run_claude

MODEL = "haiku"
TIMEOUT_SECONDS = 60.0

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {"translations": {"type": "array", "items": {"type": "string"}}},
    "required": ["translations"],
    "additionalProperties": False,
}

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
    try:
        output = await run_claude(
            model=MODEL,
            system_prompt=system_prompt,
            schema=OUTPUT_SCHEMA,
            payload=items,
            timeout=TIMEOUT_SECONDS,
        )
        translations = output["translations"]
    except (ClaudeCliError, KeyError, TypeError) as exc:
        raise TranslationError from exc
    if (
        not isinstance(translations, list)
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
