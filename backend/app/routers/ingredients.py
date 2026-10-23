"""Known ingredients endpoint, feeding the ingredient autocomplete."""

from fastapi import APIRouter
from pydantic import BaseModel

from app import glossary

router = APIRouter(prefix="/api")


class KnownIngredients(BaseModel):
    # German, first letter uppercased, sorted case-insensitively.
    ingredients: list[str]


@router.get("/ingredients")
def known_ingredients() -> KnownIngredients:
    # Dictionary keys are normalized with german_key(), so a picked suggestion
    # maps back to the same entry in the next search.
    names = [key[:1].upper() + key[1:] for key in glossary.load().de_en]
    return KnownIngredients(ingredients=sorted(names, key=str.casefold))
