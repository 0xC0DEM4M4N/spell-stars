#!/usr/bin/env python3
"""
Regenerates content-plan/word-content-tracker.csv from the current state
of public/data/<year>/words.json.

Why "unique words", not one row per slot: each year's word list cycles
through a smaller pool of real curriculum words across all its teaching
weeks (see public/data/README.md's "Revision cycling" section) -- a word
tagged revision: true is a *repeat* of an earlier appearance, not a new
word. Writing a definition/example/origin once per unique word and then
propagating it to every slot (scripts/apply_word_content.py does that
part) is ~4x less writing than doing it per slot.

Run: python3 scripts/generate_word_content_tracker.py
"""
import csv
import json
from collections import OrderedDict

TERM_ORDER = ["autumn", "spring", "summer"]
# Years already fully hand-written (see public/data/README.md) -- not
# included in the tracker, nothing outstanding.
DONE_YEARS = {"reception", "year1"}
YEARS_IN_ORDER = ["reception", "year1", "year2", "year3", "year4", "year5", "year6"]

# The landing page's own "Word origins" pitch (src/pages/YearIndex.jsx,
# VOCAB_CARDS) says origins are "for the older years" -- Year 3 upward is
# the default eligibility floor. This is a starting suggestion for which
# rows are worth considering for an origin note, not an instruction to
# fill in every single one -- see the plan doc for the "where relevant"
# judgment call.
ORIGIN_ELIGIBLE_YEARS = {"year3", "year4", "year5", "year6"}

import re
ORIGIN_HINT_PATTERN = re.compile(r"\((\w[\w\s]*?origin)\)", re.I)


def year_number(slug):
    return {"reception": 0, "year1": 1, "year2": 2, "year3": 3, "year4": 4, "year5": 5, "year6": 6}[slug]


def main():
    rows = []
    priority = 0
    for slug in YEARS_IN_ORDER:
        if slug in DONE_YEARS:
            continue
        with open(f"public/data/{slug}/words.json") as f:
            data = json.load(f)

        words_only = [w for w in data if w.get("contentType") == "word"]
        # First occurrence order == curriculum order == earliest week the
        # word is taught, since the generator lays entries out in that
        # order to begin with.
        unique = OrderedDict()
        for w in words_only:
            unique.setdefault(w["word"], w)

        missing = [w for w in unique.values() if not (w.get("definition") or "").strip()]
        # Stable sort: term (curriculum order), then first week taught,
        # then the word itself -- i.e. the order a child actually meets
        # each word in, which is also the order in the app's own Year >
        # Term > Week navigation.
        missing.sort(key=lambda w: (TERM_ORDER.index(w["term"]), w["weekOfYear"], w["word"]))

        for w in missing:
            priority += 1
            hint_match = ORIGIN_HINT_PATTERN.search(w.get("focus") or "")
            rows.append({
                "priority": priority,
                "year": year_number(slug),
                "year_slug": slug,
                "term": w["term"],
                "week_of_term": w["weekOfTerm"],
                "week_of_year": w["weekOfYear"],
                "word": w["word"],
                "category": w.get("category", ""),
                "statutory": "yes" if w.get("statutory") else "",
                "difficulty_rank": w.get("difficultyRank", ""),
                "focus": w.get("focus", ""),
                "origin_candidate": "yes" if slug in ORIGIN_ELIGIBLE_YEARS else "",
                "origin_hint": hint_match.group(1) if hint_match else "",
                "status": "todo",
                "definition": "",
                "example_sentence": "",
                "origin": "",
                "notes": "",
            })

    fieldnames = [
        "priority", "year", "year_slug", "term", "week_of_term", "week_of_year", "word",
        "category", "statutory", "difficulty_rank", "focus",
        "origin_candidate", "origin_hint",
        "status", "definition", "example_sentence", "origin", "notes",
    ]
    with open("content-plan/word-content-tracker.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to content-plan/word-content-tracker.csv")

    # Per-year, per-term breakdown for the plan doc / sanity check.
    from collections import Counter
    by_year_term = Counter((r["year_slug"], r["term"]) for r in rows)
    for slug in YEARS_IN_ORDER:
        if slug in DONE_YEARS:
            continue
        parts = [f"{term}={by_year_term[(slug, term)]}" for term in TERM_ORDER]
        total = sum(by_year_term[(slug, term)] for term in TERM_ORDER)
        print(f"  {slug}: {total} unique words needing content ({', '.join(parts)})")


if __name__ == "__main__":
    main()
