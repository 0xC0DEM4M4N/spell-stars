import json
import sys
from pathlib import Path
from datetime import date, timedelta

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))
from programme_data import DIFFERENTIATION_NOTES, HOW_BUILT, PACING, TEST_FORMAT, WEEK_ROWS, WORD_DATA

TERM_START = date(2026, 9, 7)
REFERENCE_DATE = TERM_START

def term_for_week(week):
    if week <= 12:
        return "Autumn Term"
    if week <= 24:
        return "Spring Term"
    return "Summer Term"

def format_week_start(day):
    return f"W/C {day.day} {day.strftime('%b %Y')}"

def build_week(row):
    week_start = TERM_START + timedelta(weeks=row["week"] - 1)
    words = []
    for word in row["words"].split(", "):
        text = word.rstrip("*")
        entry = WORD_DATA.get(text, {})
        words.append({
            "text": text,
            "challenge": word.endswith("*"),
            "sentence": entry.get("sentence", ""),
            "meaning": entry.get("meaning", ""),
        })
    return {
        "week": row["week"],
        "term": term_for_week(row["week"]),
        "dateLabel": format_week_start(week_start),
        "focus": row["focus"],
        "learningPoint": row["focus"],
        "words": words,
    }

PROGRAMME_WEEKS = [build_week(row) for row in WEEK_ROWS]

data = {
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

out_path = REPO_ROOT / "src" / "data" / "programme.json"
with open(out_path, "w") as f:
    json.dump(data, f, indent=2)

print("wrote", len(json.dumps(data)), "bytes")
print("weeks:", len(PROGRAMME_WEEKS))
