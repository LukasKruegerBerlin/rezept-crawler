"""Saved favorites in backend/data/favorites.json, for Spoonacular and AI recipes."""

import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, TypeAdapter, ValidationError

from app.models import RecipeDetail
from app.storage import DATA_DIR, write_atomic

FAVORITES_PATH = DATA_DIR / "favorites.json"


class Favorite(BaseModel):
    id: str
    source: Literal["spoonacular", "ai"]
    spoonacular_id: int | None
    title: str
    saved_at: datetime
    # Full recipe for AI favorites, which cannot be refetched; None for Spoonacular.
    recipe: RecipeDetail | None


class FavoritesUnreadableError(Exception):
    """favorites.json exists but cannot be read; it must not be overwritten."""


_favorites_list = TypeAdapter(list[Favorite])


def load() -> list[Favorite]:
    """Return the favorites in save order; a missing file counts as empty."""
    try:
        data = FAVORITES_PATH.read_bytes()
    except FileNotFoundError:
        return []
    except OSError as error:
        raise FavoritesUnreadableError from error
    try:
        return _favorites_list.validate_json(data)
    except ValidationError as error:
        raise FavoritesUnreadableError from error


def _save(favorites: list[Favorite]) -> None:
    # Indented, so the file stays readable by hand.
    write_atomic(
        FAVORITES_PATH, _favorites_list.dump_json(favorites, indent=2).decode()
    )


def add(recipe: RecipeDetail) -> tuple[Favorite, bool]:
    """Save a recipe; returns the favorite and whether it was newly created.

    A Spoonacular recipe is saved at most once, so saving it again returns the
    existing favorite.
    """
    favorites = load()
    if recipe.source == "spoonacular":
        for favorite in favorites:
            if favorite.spoonacular_id == recipe.spoonacular_id:
                return favorite, False
    favorite = Favorite(
        id=uuid.uuid4().hex,
        source=recipe.source,
        spoonacular_id=recipe.spoonacular_id,
        title=recipe.title,
        saved_at=datetime.now(UTC),
        recipe=recipe if recipe.source == "ai" else None,
    )
    _save([*favorites, favorite])
    return favorite, True


def remove(favorite_id: str) -> bool:
    """Remove a favorite; False when the id is unknown."""
    favorites = load()
    remaining = [f for f in favorites if f.id != favorite_id]
    if len(remaining) == len(favorites):
        return False
    _save(remaining)
    return True
