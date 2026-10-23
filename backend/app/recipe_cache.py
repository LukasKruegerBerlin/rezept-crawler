"""Local JSON cache of translated recipes, one file per Spoonacular recipe id."""

from pathlib import Path

from pydantic import ValidationError

from app.models import RecipeDetail
from app.storage import DATA_DIR, write_atomic

RECIPES_DIR = DATA_DIR / "recipes"


def _path(spoonacular_id: int) -> Path:
    return RECIPES_DIR / f"{spoonacular_id}.json"


def load(spoonacular_id: int) -> RecipeDetail | None:
    """Return the cached recipe; a missing or broken file counts as a miss."""
    try:
        return RecipeDetail.model_validate_json(_path(spoonacular_id).read_bytes())
    except (OSError, ValidationError):
        return None


def save(recipe: RecipeDetail) -> None:
    if recipe.spoonacular_id is None:
        raise ValueError("Only Spoonacular recipes are cached.")
    write_atomic(_path(recipe.spoonacular_id), recipe.model_dump_json())
