"""Spoonacular API client."""

import os
from typing import Any

import httpx

COMPLEX_SEARCH_URL = "https://api.spoonacular.com/recipes/complexSearch"
RECIPE_INFORMATION_URL = "https://api.spoonacular.com/recipes/{id}/information"
RESULT_COUNT = 20
TIMEOUT_SECONDS = 10.0


class SpoonacularQuotaError(Exception):
    """The daily point quota is exhausted (HTTP 402)."""


class SpoonacularNotFoundError(Exception):
    """The requested recipe does not exist (HTTP 404)."""


class SpoonacularUnavailableError(Exception):
    """Spoonacular failed, timed out, or returned an unusable response."""


async def _get_json(url: str, params: dict[str, str | int]) -> Any:
    params = {**params, "apiKey": os.environ["SPOONACULAR_API_KEY"]}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.get(url, params=params)
    except httpx.HTTPError as exc:
        raise SpoonacularUnavailableError from exc

    if response.status_code == 402:
        raise SpoonacularQuotaError
    if response.status_code == 404:
        raise SpoonacularNotFoundError
    if not response.is_success:
        raise SpoonacularUnavailableError

    try:
        return response.json()
    except ValueError as exc:
        raise SpoonacularUnavailableError from exc


async def search_by_ingredients(
    ingredients: list[str], max_ready_time: int | None = None
) -> list[dict[str, Any]]:
    """Return raw complexSearch results for English ingredient terms."""
    params: dict[str, str | int] = {
        "includeIngredients": ",".join(ingredients),
        "fillIngredients": "true",
        "addRecipeInformation": "true",
        "sort": "min-missing-ingredients",
        "ignorePantry": "true",
        "number": RESULT_COUNT,
    }
    if max_ready_time is not None:
        params["maxReadyTime"] = max_ready_time
    body = await _get_json(COMPLEX_SEARCH_URL, params)
    results = body.get("results") if isinstance(body, dict) else None
    if not isinstance(results, list):
        raise SpoonacularUnavailableError
    return results


async def get_recipe_information(recipe_id: int) -> dict[str, Any]:
    """Return the raw recipe information (with metric measures) for one recipe."""
    body = await _get_json(
        RECIPE_INFORMATION_URL.format(id=recipe_id), {"includeNutrition": "false"}
    )
    if not isinstance(body, dict):
        raise SpoonacularUnavailableError
    return body
