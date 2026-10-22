"""Spoonacular API client."""

import os
from typing import Any

import httpx

COMPLEX_SEARCH_URL = "https://api.spoonacular.com/recipes/complexSearch"
RESULT_COUNT = 20
TIMEOUT_SECONDS = 10.0


class SpoonacularQuotaError(Exception):
    """The daily point quota is exhausted (HTTP 402)."""


class SpoonacularUnavailableError(Exception):
    """Spoonacular failed, timed out, or returned an unusable response."""


async def search_by_ingredients(ingredients: list[str]) -> list[dict[str, Any]]:
    """Return raw complexSearch results for English ingredient terms."""
    params: dict[str, str | int] = {
        "includeIngredients": ",".join(ingredients),
        "fillIngredients": "true",
        "addRecipeInformation": "true",
        "sort": "min-missing-ingredients",
        "ignorePantry": "true",
        "number": RESULT_COUNT,
        "apiKey": os.environ["SPOONACULAR_API_KEY"],
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.get(COMPLEX_SEARCH_URL, params=params)
    except httpx.HTTPError as exc:
        raise SpoonacularUnavailableError from exc

    if response.status_code == 402:
        raise SpoonacularQuotaError
    if not response.is_success:
        raise SpoonacularUnavailableError

    try:
        results = response.json()["results"]
    except (ValueError, KeyError) as exc:
        raise SpoonacularUnavailableError from exc
    if not isinstance(results, list):
        raise SpoonacularUnavailableError
    return results
