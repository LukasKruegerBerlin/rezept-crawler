"""Ingredient search endpoint."""

import os
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StringConstraints

from app import glossary
from app.ranking import rank_recipes
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
    # Whole minutes; None means no limit. The upper bound is only a sanity check.
    max_ready_time: int | None = Field(default=None, ge=1, le=1440)


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


async def _english_ingredients(ingredients: list[str]) -> list[str]:
    """English search terms in input order; only unknown ingredients go to the CLI.

    Raises TranslationError when the CLI is needed and fails.
    """
    known = glossary.load().de_en
    keys = [glossary.german_key(i) for i in ingredients]
    originals: dict[str, str] = {}
    for key, ingredient in zip(keys, ingredients, strict=True):
        if key not in known:
            originals.setdefault(key, ingredient)
    if originals:
        english = await ingredients_to_english(list(originals.values()))
        new = dict(zip(originals, english, strict=True))
        glossary.add(de_en=new)
        known = {**known, **new}
    return [known[key] for key in keys]


async def _german_texts(texts: list[str]) -> tuple[dict[str, str], bool]:
    """German texts from the dictionary plus one CLI call for the unknown rest.

    The flag is False when that call failed; unknown texts are then missing from
    the dictionary and stay English.
    """
    known = glossary.load().en_de
    unknown = list(dict.fromkeys(t for t in texts if t not in known))
    if not unknown:
        return known, True
    try:
        new = dict(zip(unknown, await to_german(unknown), strict=True))
    except TranslationError:
        return known, False
    glossary.add(en_de=new)
    return {**known, **new}, True


@router.post("/search")
async def search(request: SearchRequest) -> SearchResponse:
    if not os.environ.get("SPOONACULAR_API_KEY"):
        raise HTTPException(500, "API-Schlüssel fehlt. Bitte backend/.env prüfen.")

    try:
        english = await _english_ingredients(request.ingredients)
        recipes = rank_recipes(
            await search_by_ingredients(english, request.max_ready_time)
        )
    except SpoonacularQuotaError:
        raise HTTPException(503, "Das Spoonacular-Tageskontingent ist aufgebraucht.")
    except SpoonacularUnavailableError:
        raise HTTPException(502, "Live-Rezepte sind gerade nicht verfügbar.")
    except TranslationError:
        raise HTTPException(502, "Die Übersetzung ist fehlgeschlagen.")

    if not recipes:
        return SearchResponse(results=[], translated=True)

    # Texts translated before (in any search or recipe) come from the dictionary.
    german, translated = await _german_texts(
        [
            text
            for r in recipes
            for text in [r.title, *r.used_ingredients, *r.missing_ingredients]
        ]
    )

    def text(value: str) -> str:
        return german.get(value, value)

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
        translated=translated,
    )
