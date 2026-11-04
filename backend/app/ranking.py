"""Missing-count and ranking rules for Spoonacular search results."""

import html
from dataclasses import dataclass
from typing import Any

# Spoonacular files spices under this aisle; they never count as missing.
SPICE_AISLE = "Spices and Seasonings"

# Results are weak when fewer than GOOD_RESULTS_MIN recipes miss at most
# GOOD_MISSING_MAX ingredients; the UI then highlights the AI recipe offer.
GOOD_MISSING_MAX = 2
GOOD_RESULTS_MIN = 3


@dataclass
class RankedRecipe:
    spoonacular_id: int
    title: str
    image: str | None
    ready_in_minutes: int | None
    used_ingredients: list[str]
    missing_ingredients: list[str]

    @property
    def missing_count(self) -> int:
        return len(self.missing_ingredients)


def is_spice(ingredient: dict[str, Any]) -> bool:
    return SPICE_AISLE.lower() in (ingredient.get("aisle") or "").lower()


def to_ranked_recipe(result: dict[str, Any]) -> RankedRecipe:
    """Convert one complexSearch result; spices are dropped from the missing list.

    Pantry basics are already excluded by Spoonacular's ``ignorePantry``.
    """
    return RankedRecipe(
        spoonacular_id=result["id"],
        title=html.unescape(result["title"]),
        image=result.get("image"),
        ready_in_minutes=result.get("readyInMinutes"),
        used_ingredients=[i["name"] for i in result.get("usedIngredients", [])],
        missing_ingredients=[
            i["name"] for i in result.get("missedIngredients", []) if not is_spice(i)
        ],
    )


def rank_recipes(results: list[dict[str, Any]]) -> list[RankedRecipe]:
    """Fewest missing first; ties go to more used ingredients, then Spoonacular order."""
    recipes = [to_ranked_recipe(r) for r in results]
    return sorted(recipes, key=lambda r: (r.missing_count, -len(r.used_ingredients)))


def good_count(recipes: list[RankedRecipe]) -> int:
    return sum(1 for r in recipes if r.missing_count <= GOOD_MISSING_MAX)
