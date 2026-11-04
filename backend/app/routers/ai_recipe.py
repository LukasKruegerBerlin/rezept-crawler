"""AI recipe endpoint; the recipe is only generated when the user asks for it."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai_recipe import AiRecipeError, generate_recipe
from app.models import RecipeDetail
from app.routers.search import SearchRequest

router = APIRouter(prefix="/api")


class AiRecipeResponse(BaseModel):
    recipe: RecipeDetail


@router.post("/ai-recipe")
async def ai_recipe(request: SearchRequest) -> AiRecipeResponse:
    try:
        recipe = await generate_recipe(request.ingredients, request.max_ready_time)
    except AiRecipeError:
        raise HTTPException(502, "Der KI-Vorschlag konnte nicht erstellt werden.")
    return AiRecipeResponse(recipe=recipe)
