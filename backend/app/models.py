"""Recipe shape shared by the detail endpoint, the cache, search, and later features."""

from typing import Literal

from pydantic import BaseModel


class IngredientLine(BaseModel):
    name: str
    amount: float | None
    unit: str


class RecipeDetail(BaseModel):
    source: Literal["spoonacular", "ai"]
    spoonacular_id: int | None
    title: str
    image: str | None
    ready_in_minutes: int | None
    ingredients: list[IngredientLine]
    steps: list[str]
