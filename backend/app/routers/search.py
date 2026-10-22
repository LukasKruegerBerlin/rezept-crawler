"""Ingredient search endpoint."""

import os
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StringConstraints

from app.ranking import RankedRecipe, rank_recipes
from app.spoonacular import (
    SpoonacularQuotaError,
    SpoonacularUnavailableError,
    search_by_ingredients,
)
from app.translation import TranslationError, ingredients_to_english, to_german

router = APIRouter(prefix="/api")

Ingredient = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)
]


class SearchRequest(BaseModel):
    ingredients: list[Ingredient] = Field(min_length=1, max_length=20)


class RecipeSummary(BaseModel):
    source: Literal["spoonacular"] = "spoonacular"
    spoonacular_id: int
    title: str
    image: str | None
    ready_in_minutes: int | None
    used_ingredients: list[str]
    missing_ingredients: list[str]
    missing_count: int


class SearchResponse(BaseModel):
    results: list[RecipeSummary]
    # False when the result translation failed and the texts are English.
    translated: bool


async def _german_texts(recipes: list[RankedRecipe]) -> dict[str, str] | None:
    """Translate every title and ingredient name in one batched call.

    Returns None when the translation fails, so the caller can fall back to English.
    """
    texts = list(
        dict.fromkeys(
            text
            for r in recipes
            for text in [r.title, *r.used_ingredients, *r.missing_ingredients]
        )
    )
    try:
        return dict(zip(texts, await to_german(texts), strict=True))
    except TranslationError:
        return None


@router.post("/search")
async def search(request: SearchRequest) -> SearchResponse:
    if not os.environ.get("SPOONACULAR_API_KEY"):
        raise HTTPException(500, "API-Schlüssel fehlt. Bitte backend/.env prüfen.")

    try:
        english = await ingredients_to_english(request.ingredients)
        recipes = rank_recipes(await search_by_ingredients(english))
    except SpoonacularQuotaError:
        raise HTTPException(503, "Das Spoonacular-Tageskontingent ist aufgebraucht.")
    except SpoonacularUnavailableError:
        raise HTTPException(502, "Live-Rezepte sind gerade nicht verfügbar.")
    except TranslationError:
        raise HTTPException(502, "Die Übersetzung ist fehlgeschlagen.")

    if not recipes:
        return SearchResponse(results=[], translated=True)

    german = await _german_texts(recipes)

    def text(value: str) -> str:
        return german[value] if german is not None else value

    return SearchResponse(
        results=[
            RecipeSummary(
                spoonacular_id=r.spoonacular_id,
                title=text(r.title),
                image=r.image,
                ready_in_minutes=r.ready_in_minutes,
                used_ingredients=[text(i) for i in r.used_ingredients],
                missing_ingredients=[text(i) for i in r.missing_ingredients],
                missing_count=r.missing_count,
            )
            for r in recipes
        ],
        translated=german is not None,
    )
