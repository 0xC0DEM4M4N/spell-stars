#!/usr/bin/env python3
"""Builds public/data/vocab.json: every spelling word in the programme and the
point at which it is first covered, as [yearIndex, week] (Reception = 0 up to
Year 6 = 6). Dictation's AI sentences are checked against it, so the AI only
uses words a year group has met by that week (see src/lib/dictationVocab.js).

Run from the repo root after the word lists change:
    python3 scripts/build_vocab.py
A test fails if the file is out of date."""
import json
from pathlib import Path

YEARS = ["reception", "year1", "year2", "year3", "year4", "year5", "year6"]
root = Path(__file__).resolve().parent.parent
words = {}
for year_index, slug in enumerate(YEARS):
    for entry in json.loads((root / "public/data" / slug / "words.json").read_text()):
        if entry.get("contentType") != "word" or not entry.get("word"):
            continue
        key = entry["word"].lower()
        point = [year_index, entry["weekOfYear"]]
        if key not in words or point < words[key]:
            words[key] = point

out = {"years": YEARS, "words": dict(sorted(words.items()))}
(root / "public/data/vocab.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
print(f"{len(words)} words written to public/data/vocab.json")
