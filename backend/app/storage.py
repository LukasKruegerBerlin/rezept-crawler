"""Local JSON files under backend/data (git-ignored)."""

import os
import tempfile
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def write_atomic(path: Path, text: str) -> None:
    """Write via a temp file, so a crash never leaves a half-written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(text)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise
