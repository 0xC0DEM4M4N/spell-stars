from datetime import date, timedelta
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from programme_data import DIFFERENTIATION_NOTES, HOW_BUILT, PACING, TEST_FORMAT, WEEK_ROWS, WORD_DATA

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

TERM_START = date(2026, 9, 7)
REFERENCE_DATE = TERM_START

app = FastAPI(title="Spell Matrix API")
api_router = APIRouter(prefix="/api")


def term_for_week(week: int) -> str:
    if week <= 12:
        return "Autumn Term"
    if week <= 24:
        return "Spring Term"
    return "Summer Term"


def format_week_start(day: date) -> str:
    return f"W/C {day.day} {day.strftime('%b %Y')}"


def build_week(row: dict) -> dict:
    week_start = TERM_START + timedelta(weeks=row["week"] - 1)
    words = [
        {"text": word.rstrip("*"), "challenge": word.endswith("*")}
        for word in row["words"].split(", ")
    ]
    return {
        "week": row["week"],
        "term": term_for_week(row["week"]),
        "dateLabel": format_week_start(week_start),
        "focus": row["focus"],
        "learningPoint": row["focus"],
        "words": words,
    }


PROGRAMME_WEEKS = [build_week(row) for row in WEEK_ROWS]


@api_router.get("/")
async def root():
    return {"message": "Spell Matrix API online"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


@api_router.get("/programme")
async def get_programme():
    return {
        "title": "Year 2 Weekly Spelling Programme",
        "termStart": TERM_START.isoformat(),
        "referenceDate": REFERENCE_DATE.isoformat(),
        "currentWeek": 1,
        "totalWeeks": len(PROGRAMME_WEEKS),
        "weeks": PROGRAMME_WEEKS,
        "notes": {
            "howBuilt": HOW_BUILT,
            "testFormat": TEST_FORMAT,
            "pacing": PACING,
            "differentiation": DIFFERENTIATION_NOTES,
        },
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
