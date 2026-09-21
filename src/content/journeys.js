// The two journeys shown as timelines: what a child does on screen, and the
// routine that moves it onto paper and out loud. Rendered by
// components/JourneyTimeline.jsx. `icon` names a drawing in that file.

export const JOURNEY_LEDE =
  "Every spelling list runs through two connected journeys: a digital one built for daily recall, and an offline one that makes sure the words hold up on paper and out loud.";

export const HANDOFF_TITLE = "Screen practice, then paper and voice.";

export const HANDOFF_COPY =
  "Typing a word correctly isn't quite the same skill as writing it, and spelling tests are still mostly said aloud and written by hand. A weekly routine that moves from recognising a word, to recalling it on screen, to writing it from memory, to producing it with nothing in front of you at all, covers more ground than any one of those alone.";

export const JOURNEYS = {
  digital: {
    count: "4 daily ways to practise",
    steps: [
      {
        icon: "sparkle",
        title: "Practice",
        body: "Type each spelling, hear it read aloud, get instant feedback — with a spaced-repetition engine underneath, so words gotten wrong come back sooner than ones already nailed.",
      },
      {
        icon: "grid",
        title: "Word search",
        body: "Grids scaled to the year — small, with no diagonals, for the youngest years; bigger, with backwards and diagonal placements, once reading fluency catches up.",
      },
      {
        icon: "book",
        title: "Letter of the day",
        body: "Reception starts before whole words: one grapheme a day, with a picture-matching game to find everything that makes that sound, before moving on to spelling words.",
      },
      {
        icon: "calendar",
        title: "Your pace, your call",
        body: "Practise this week's list, everything covered this term, or the whole year so far — the current week is something set by the family, not something the calendar guesses at.",
      },
    ],
    note: {
      icon: "refresh",
      text: "Practice adapts to each year automatically — input style, reading speed, word-search difficulty and daily pacing all follow the year a child is in, from one shared template.",
    },
  },
  offline: {
    count: "5 steps, spread across the week",
    steps: [
      {
        icon: "grid",
        title: "Word search first",
        body: "Start with this week's word search, on screen or printed. It only asks a child to recognise a word, not produce it from memory — a low-pressure way to get the shapes of the words familiar before anything harder.",
      },
      {
        icon: "sparkle",
        title: "Play the practice game",
        body: "Type each word, hear it read aloud, get instant feedback. This is the first proper recall step — SRS-lite quietly tracks which words are shaky, so those are the ones that resurface soonest.",
      },
      {
        icon: "sheet",
        title: "Print the practice sheet",
        body: "Take the list off the screen. Handwriting engages a different kind of memory to typing, and it's how spelling actually gets tested at school — a purely on-screen routine skips that rehearsal.",
      },
      {
        icon: "checklist",
        title: "Look, cover, write, check",
        body: "For each word: look at it, say it out loud, cover it up, write it from memory, then uncover and check. Get it wrong? Just repeat that word, not the whole list — the bit that's easy to skip but does most of the work.",
      },
      {
        icon: "question",
        title: "Finish with a verbal test",
        body: "No page in sight — say the word (use the app's listen button if the pronunciation is unclear) and have them spell it back or write it down cold. The closest thing to how it'll actually be tested, and the real check on whether it's stuck.",
      },
    ],
    note: {
      icon: "clock",
      text: "Best spread across the week, not done in one sitting — word search early on, look/cover/write/check mid-week, verbal test at the end — so it lines up with SRS-lite's own spacing instead of cramming.",
    },
  },
};
