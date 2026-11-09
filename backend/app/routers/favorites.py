"""Favorites endpoints: list, save, and remove."""

from typing import Self

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, model_validator

from app import favorites, recipe_cache
from app.favorites import Favorite, FavoritesUnreadableError
from app.models import RecipeDetail

router = APIRouter(prefix="/api")

UNREADABLE_DETAIL = (
    "Favoriten konnten nicht gelesen werden. Bitte backend/data/favorites.json prüfen."
)


class FavoriteCreate(BaseModel):
    recipe: RecipeDetail

    @model_validator(mode="after")
    def check_source(self) -> Self:
        recipe = self.recipe
        if recipe.source == "spoonacular" and (
            recipe.spoonacular_id is None or recipe.spoonacular_id < 1
        ):
            raise ValueError("Spoonacular recipes need a positive spoonacular_id.")
        if recipe.source == "ai" and recipe.spoonacular_id is not None:
            raise ValueError("AI recipes have no spoonacular_id.")
        return self


class FavoritesResponse(BaseModel):
    favorites: list[Favorite]


class FavoriteResponse(BaseModel):
    favorite: Favorite


def with_cached_title(favorite: Favorite) -> Favorite:
    """Prefer the cached German title, in case the recipe was saved untranslated."""
    if favorite.spoonacular_id is None:
        return favorite
    cached = recipe_cache.load(favorite.spoonacular_id)
    if cached is None:
        return favorite
    return favorite.model_copy(update={"title": cached.title})


@router.get("/favorites")
def list_favorites() -> FavoritesResponse:
    try:
        saved = favorites.load()
    except FavoritesUnreadableError:
        raise HTTPException(500, UNREADABLE_DETAIL)
    return FavoritesResponse(favorites=[with_cached_title(f) for f in reversed(saved)])


@router.post("/favorites", status_code=201)
def add_favorite(request: FavoriteCreate, response: Response) -> FavoriteResponse:
    try:
        favorite, created = favorites.add(request.recipe)
    except FavoritesUnreadableError:
        raise HTTPException(500, UNREADABLE_DETAIL)
    if not created:
        response.status_code = 200
    return FavoriteResponse(favorite=favorite)


@router.delete("/favorites/{favorite_id}", status_code=204)
def remove_favorite(favorite_id: str) -> None:
    try:
        removed = favorites.remove(favorite_id)
    except FavoritesUnreadableError:
        raise HTTPException(500, UNREADABLE_DETAIL)
    if not removed:
        raise HTTPException(404, "Favorit nicht gefunden.")
