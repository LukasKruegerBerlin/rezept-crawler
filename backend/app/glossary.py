"""Translation dictionary, so the slow claude CLI only sees texts it never translated.

Holds German -> English ingredient terms for the search input and English -> German
titles, ingredient names, and units. Cooking steps live in the recipe cache instead.
"""

from pydantic import BaseModel, ValidationError

from app.storage import DATA_DIR, write_atomic

GLOSSARY_PATH = DATA_DIR / "translations.json"


class Glossary(BaseModel):
    # Keys are normalized with german_key().
    de_en: dict[str, str] = {}
    # Keys are the exact Spoonacular text.
    en_de: dict[str, str] = {}


def german_key(text: str) -> str:
    """Normalize a German ingredient, so "Eier" and "eier " share one entry."""
    return text.strip().casefold()


def load() -> Glossary:
    """Return the dictionary; a missing or broken file counts as empty."""
    try:
        return Glossary.model_validate_json(GLOSSARY_PATH.read_bytes())
    except (OSError, ValidationError):
        return Glossary()


def add(
    *, de_en: dict[str, str] | None = None, en_de: dict[str, str] | None = None
) -> None:
    """Store new translations; existing entries win, so every view stays consistent."""
    if not de_en and not en_de:
        return
    glossary = load()
    for key, value in (de_en or {}).items():
        glossary.de_en.setdefault(key, value)
    for key, value in (en_de or {}).items():
        glossary.en_de.setdefault(key, value)
    # Indented, so odd translations can still be fixed by hand.
    write_atomic(GLOSSARY_PATH, glossary.model_dump_json(indent=2))
