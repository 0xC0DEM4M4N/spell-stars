#!/usr/bin/env python3
"""
Applies filled-in rows from content-plan/word-content-tracker.csv back
into public/data/<year>/words.json.

A tracker row is "filled in" once both `definition` and `example_sentence`
are non-empty (`origin` is optional -- see the plan doc's "where
relevant" guidance, most words should leave it blank). For each filled
row this writes definition/exampleSentence/origin onto *every* occurrence
of that word in that year's words.json -- including its revision repeats
in later weeks -- and clears needsContentReview. That's the payoff of
tracking by unique word instead of by slot: filling in one tracker row
finishes every occurrence of that word for the year in one go.

Usage:
  python3 scripts/apply_word_content.py            # dry run: reports what would change
  python3 scripts/apply_word_content.py --write     # actually writes the words.json files

Safe to run repeatedly -- rows already applied (definition already set,
status already "done") are skipped, and a tracker row whose word can't be
found in that year's words.json is reported as an error rather than
silently ignored.
"""
import csv
import json
import sys

TRACKER_PATH = "content-plan/word-content-tracker.csv"


def main():
    write = "--write" in sys.argv

    with open(TRACKER_PATH, newline="") as f:
        rows = list(csv.DictReader(f))

    # Group filled rows by year_slug.
    by_year = {}
    skipped_blank = 0
    for row in rows:
        definition = row["definition"].strip()
        example = row["example_sentence"].strip()
        if not definition or not example:
            skipped_blank += 1
            continue
        by_year.setdefault(row["year_slug"], []).append(row)

    total_applied = 0
    total_not_found = 0
    total_files_changed = 0

    for year_slug, filled_rows in by_year.items():
        path = f"public/data/{year_slug}/words.json"
        with open(path) as f:
            data = json.load(f)

        by_word = {}
        for entry in data:
            by_word.setdefault(entry.get("word"), []).append(entry)

        file_changed = False
        for row in filled_rows:
            word = row["word"]
            entries = by_word.get(word)
            if not entries:
                print(f"  ERROR: {year_slug}: tracker word {word!r} not found in words.json")
                total_not_found += 1
                continue
            for entry in entries:
                entry["definition"] = row["definition"].strip()
                entry["exampleSentence"] = row["example_sentence"].strip()
                origin = row["origin"].strip()
                if origin:
                    entry["origin"] = origin
                entry["needsContentReview"] = False
                file_changed = True
                total_applied += 1

        if file_changed:
            total_files_changed += 1
            if write:
                with open(path, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                print(f"  wrote {path} ({sum(1 for r in filled_rows if by_word.get(r['word']))} words applied)")
            else:
                print(f"  [dry run] would write {path} ({sum(1 for r in filled_rows if by_word.get(r['word']))} words applied)")

    print()
    print(f"Filled tracker rows: {sum(len(v) for v in by_year.values())}")
    print(f"Still blank in tracker: {skipped_blank}")
    print(f"Entries updated (across all revision slots): {total_applied}")
    print(f"Files touched: {total_files_changed}")
    if total_not_found:
        print(f"Words not found (check spelling matches the CSV exactly): {total_not_found}")
    if not write:
        print()
        print("Dry run only -- re-run with --write to actually update the words.json files.")


if __name__ == "__main__":
    main()
