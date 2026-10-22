from dotenv import load_dotenv
from fastapi import FastAPI

from app.routers import search

# API keys live in backend/.env; modules read them at request time.
load_dotenv()

app = FastAPI(title="Recipe Crawler API")
app.include_router(search.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
