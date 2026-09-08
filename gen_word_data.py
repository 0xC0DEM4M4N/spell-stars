"""
One-shot script: generates UK English sentences + meanings for every
spelling word in the Year 2 programme, then prints a Python dict
that can be pasted into programme_data.py as WORD_DATA.
"""
import asyncio
import json
import sys
import os
sys.path.insert(0, "/app/backend")

from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from programme_data import WEEK_ROWS

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

SYSTEM = (
    "You are a UK primary school teacher. "
    "Always use British English spelling (colour, favourite, behaviour, etc.). "
    "Keep sentences simple, positive, and fun for 6–7 year olds (8–14 words). "
    "Keep meanings very short and child-friendly (under 12 words). "
    "Never begin a sentence with 'The' for every entry — vary the starts. "
    "Return ONLY valid JSON — no markdown, no code fences, no explanation."
)

async def enrich_week(week_num: int, raw_words: list[str]) -> dict:
    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"spell-gen-w{week_num}",
            system_message=SYSTEM,
        )
        .with_model("openai", "gpt-5.4-mini")
    )

    word_list = json.dumps(raw_words)
    prompt = (
        f"Week {week_num} spelling words: {word_list}\n\n"
        "Return a JSON array. Each element must be:\n"
        '{"text": "<word>", "sentence": "<UK English sentence>", "meaning": "<child-friendly definition>"}\n'
        "Use the word exactly as given. All apostrophes must be straight (')."
    )

    full = ""
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            full += ev.content
        elif isinstance(ev, StreamDone):
            break

    try:
        items = json.loads(full)
    except json.JSONDecodeError:
        # strip markdown fences if present
        cleaned = full.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        items = json.loads(cleaned)

    result = {}
    for item in items:
        result[item["text"]] = {"sentence": item["sentence"], "meaning": item["meaning"]}
    return result


async def main():
    all_words: dict[str, dict] = {}

    # Build week batches (4 at a time)
    weeks = [
        (row["week"], [w.rstrip("*") for w in row["words"].split(", ")])
        for row in WEEK_ROWS
    ]

    batch_size = 4
    for i in range(0, len(weeks), batch_size):
        batch = weeks[i : i + batch_size]
        print(f"Generating weeks {[w[0] for w in batch]}...", file=sys.stderr)
        results = await asyncio.gather(*[enrich_week(wn, ws) for wn, ws in batch])
        for res in results:
            all_words.update(res)

    # Print as Python dict
    print("WORD_DATA = {")
    for word, data in sorted(all_words.items()):
        sent = data["sentence"].replace("'", "\\'")
        mean = data["meaning"].replace("'", "\\'")
        print(f"    '{word}': {{'sentence': '{sent}', 'meaning': '{mean}'}},")
    print("}")


asyncio.run(main())
