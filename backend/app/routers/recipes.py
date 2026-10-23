"""Recipe detail endpoint."""

import html
import os
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel

from app import glossary, recipe_cache
from app.models import IngredientLine, RecipeDetail
from app.spoonacular import (
    SpoonacularNotFoundError,
    SpoonacularQuotaError,
    SpoonacularUnavailableError,
    get_recipe_information,
)
from app.translation import TranslationError, recipe_to_german

router = APIRouter(prefix="/api")


class RecipeDetailResponse(BaseModel):
    recipe: RecipeDetail
    # False when the translation failed and the texts are English.
    translated: bool


def to_ingredient_line(ingredient: dict[str, Any]) -> IngredientLine:
    metric = (ingredient.get("measures") or {}).get("metric") or {}
    return IngredientLine(
        name=ingredient["name"],
        amount=metric.get("amount"),
        unit=metric.get("unitShort") or "",
    )


def to_recipe_detail(raw: dict[str, Any]) -> RecipeDetail:
    """Convert a Spoonacular recipe information response (English)."""
    return RecipeDetail(
        source="spoonacular",
        spoonacular_id=raw["id"],
        title=html.unescape(raw["title"]),
        image=raw.get("image"),
        ready_in_minutes=raw.get("readyInMinutes"),
        ingredients=[to_ingredient_line(i) for i in raw.get("extendedIngredients", [])],
        steps=[
            step["step"]
            for instruction in raw.get("analyzedInstructions", [])
            for step in instruction.get("steps", [])
        ],
    )


async def translate_recipe(recipe: RecipeDetail) -> RecipeDetail:
    """Translate in at most one batched call; raises TranslationError.

    Titles, ingredient names, and units translated before come from the
    dictionary; the rest and all steps go to the CLI.
    """
    known = glossary.load().en_de
    terms = [
        recipe.title,
        *(i.name for i in recipe.ingredients),
        *(i.unit for i in recipe.ingredients if i.unit),
    ]
    new_terms = list(dict.fromkeys(t for t in terms if t not in known))
    texts = list(dict.fromkeys([*new_terms, *recipe.steps]))
    translated = (
        dict(zip(texts, await recipe_to_german(texts), strict=True)) if texts else {}
    )
    glossary.add(en_de={t: translated[t] for t in new_terms})
    german = {**known, **translated}
    return recipe.model_copy(
        update={
            "title": german[recipe.title],
            "ingredients": [
                i.model_copy(
                    update={
                        "name": german[i.name],
                        "unit": german[i.unit] if i.unit else "",
                    }
                )
                for i in recipe.ingredients
            ],
            "steps": [german[s] for s in recipe.steps],
        }
    )


@router.get("/recipes/{spoonacular_id}")
async def recipe_detail(
    spoonacular_id: Annotated[int, Path(gt=0)],
) -> RecipeDetailResponse:
    # Cached recipes open even when Spoonacular or the API key is unavailable.
    cached = recipe_cache.load(spoonacular_id)
    if cached is not None:
        return RecipeDetailResponse(recipe=cached, translated=True)

    if not os.environ.get("SPOONACULAR_API_KEY"):
        raise HTTPException(500, "API-Schlüssel fehlt. Bitte backend/.env prüfen.")

    try:
        raw = await get_recipe_information(spoonacular_id)
        recipe = to_recipe_detail(raw)
    except SpoonacularNotFoundError:
        raise HTTPException(404, "Rezept nicht gefunden.")
    except SpoonacularQuotaError:
        raise HTTPException(503, "Das Spoonacular-Tageskontingent ist aufgebraucht.")
    except (SpoonacularUnavailableError, KeyError, TypeError, ValueError):
        raise HTTPException(502, "Live-Rezepte sind gerade nicht verfügbar.")

    try:
        german = await translate_recipe(recipe)
    except TranslationError:
        # Not cached, so the next open retries the translation.
        return RecipeDetailResponse(recipe=recipe, translated=False)

    recipe_cache.save(german)
    return RecipeDetailResponse(recipe=german, translated=True)
