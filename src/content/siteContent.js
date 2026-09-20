import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Grid2x2,
  Landmark,
  MessageCircleQuestion,
  NotebookText,
  Printer,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

// Long-form copy that used to live on the home page. Each page under
// /how-it-works, /for-educators and /faq renders its own slice of this.

export const FEATURES = [
  {
    icon: Sparkles,
    title: "Practice",
    body: "Type each spelling, hear it read aloud, get instant feedback — with a spaced-repetition engine underneath, so words you got wrong come back sooner than ones you've nailed.",
  },
  {
    icon: Grid2x2,
    title: "Word search",
    body: "A wordsearch scaled to the year — small grids with no diagonals for the youngest years, bigger grids with backwards and diagonal placements once reading fluency catches up.",
  },
  {
    icon: BookOpen,
    title: "Letter of the day",
    body: "Reception starts before whole words: one grapheme a day, with a picture-matching game to find everything that makes that sound, before moving on to spelling words.",
  },
  {
    icon: CalendarDays,
    title: "Your pace, your call",
    body: "Practice this week's list, everything covered this term, or the whole year so far — the current week is something you set, not something the calendar guesses at.",
  },
];

export const SESSION_STEPS = [
  {
    step: "01",
    title: "Pick a year and a week",
    body: "Reception through Year 6, each mapped to the National Curriculum's programmes of study — DfE English Appendix 1 statutory word lists for Years 1–6, and the Letters and Sounds phonics framework for Reception. Weeks follow the school's autumn, spring and summer terms.",
  },
  {
    step: "02",
    title: "Practice the words",
    body: "Type each word, hear it read aloud at a year-appropriate pace, and get instant feedback. Underneath, a lightweight spaced-repetition engine (SRS-lite) tracks every word through six boxes — get one wrong and it comes back around sooner; get it right a few times and it drops away.",
  },
  {
    step: "03",
    title: "Meet the word properly",
    body: "Every word comes with a definition and an example sentence, so children see it used in context — not just memorising letters, but building real vocabulary alongside the spelling.",
  },
  {
    step: "04",
    title: "Reinforce with a word search",
    body: "A wordsearch grid scaled to the year group — small and upright for the youngest years, bigger with backwards and diagonal words once reading fluency catches up. Print it, or play it on screen against the clock.",
  },
  {
    step: "05",
    title: "Review on your terms",
    body: "Come back to this week's list, everything covered so far this term, or the whole year to date. Progress is saved as you go, so due words resurface automatically next time.",
  },
];

// A recommended offline routine that sits alongside the on-screen session
// above -- SRS-lite covers spaced repetition and recall on a screen, but
// spelling is ultimately tested (and mostly used) with a pencil, so the
// site also points people at the classic look/cover/write/check sequence,
// bookended by tools this app already has (word search, print sheet,
// audio pronunciation).
export const WEEKLY_ROUTINE = [
  {
    step: "01",
    icon: Grid2x2,
    title: "Word search first",
    body: "Start with this week's word search, on screen or printed. It only asks a child to recognise a word, not produce it from memory, so it's a low-pressure way to get the shapes of the words familiar before anything harder.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Play the practice game",
    body: "Type each word, hear it read aloud, get instant feedback. This is the first proper recall step — SRS-lite quietly tracks which words are shaky, so those are the ones that resurface soonest.",
  },
  {
    step: "03",
    icon: Printer,
    title: "Print the practice sheet",
    body: "Take the list off the screen. Handwriting engages a different kind of memory to typing, and it's how spelling actually gets tested at school — a purely on-screen routine skips that rehearsal.",
  },
  {
    step: "04",
    icon: NotebookText,
    title: "Look, cover, write, check",
    body: "For each word: look at it, say it out loud, cover it up, write it from memory, then uncover and check. Get it wrong? Just repeat the word, not the whole list — that's the bit that's easy to skip but does most of the work.",
  },
  {
    step: "05",
    icon: MessageCircleQuestion,
    title: "Finish with a verbal test",
    body: "No page in sight — say the word (use the app's listen button if you're not sure how it's pronounced) and have them spell it back or write it down cold. It's the closest thing to how it'll actually be tested, and the real check on whether it's stuck.",
  },
];

export const VOCAB_CARDS = [
  {
    icon: NotebookText,
    title: "Definitions",
    body: "Every word is paired with a clear, age-appropriate definition — so children learn what a word means, not only how it's spelled.",
  },
  {
    icon: ScrollText,
    title: "Example sentences",
    body: "Each word appears in context, in a sentence a child would actually recognise — the fastest way to make a new word stick.",
  },
  {
    icon: Landmark,
    title: "Word origins",
    body: "For the older years, words come with a short note on where they come from — the Latin, Greek or Old English root behind them — so children understand a word's true meaning, not just its letters.",
  },
];

export const FAQS = [
  {
    q: "What year groups does SPELL// STARS cover?",
    a: "Every year of primary school — Reception through to Year 6 — each with its own word list, difficulty and pacing.",
  },
  {
    q: "How much practice does my child actually need?",
    a: "Little and often works best — around 10 minutes a day is enough to work through a week's words and keep due reviews ticking over, rather than one long session.",
  },
  {
    q: "Is it aligned to what school is teaching?",
    a: "Yes. Word lists follow the DfE National Curriculum's English Appendix 1 statutory spelling lists for Years 1–6, and the Letters and Sounds phonics framework for Reception, structured across the same autumn, spring and summer terms as the school year.",
  },
  {
    q: "What is the spaced-repetition system (SRS-lite)?",
    a: "A simple six-box Leitner system. Every word starts in box one; get it right and it moves up a box with a longer gap before it's due again; get it wrong and it drops back down. Over time, practice naturally focuses on the words that still need it.",
  },
  {
    q: "Where is my child's progress saved?",
    a: "Locally, in the browser on the device they're practising on — so progress carries over every time they come back on that device, though it doesn't yet sync across different devices.",
  },
  {
    q: "Do the words come with definitions and example sentences for every year?",
    a: "That's the goal for every year group — Reception and Year 1 are fully there today, with the rest of the word lists being filled in.",
  },
];

export const EDUCATOR_NOTES = [
  {
    icon: ClipboardCheck,
    title: "Suggested weekly check",
    body: "Read the word, use it in a sentence, ask the child to write it down — testing a word in context catches children who can pattern-match a list without being able to use the word correctly.",
  },
  {
    icon: CalendarDays,
    title: "Pacing",
    body: "Each year's weeks are spread across autumn, spring and summer with room for INSET days and assessment weeks. A child who's ahead can move into the term or whole-year scope rather than waiting for the calendar — the pace is set by you, not a fixed date.",
  },
  {
    icon: SlidersHorizontal,
    title: "Differentiation",
    body: "Drop back to a single week and repeat it until the SRS-lite boxes show it's sticking, or jump ahead to the term/whole-year scope for confident spellers. Try asking \"what's the rule?\" before naming it — showing a week's list and letting a child spot the shared pattern suits those ready to reason about spelling, not just memorise it.",
  },
  {
    icon: Printer,
    title: "Worksheets, on demand",
    body: "Every word search has a print button for an offline worksheet, and the practice timer can switch to countdown mode for a bit of gentle pressure once a list is well known.",
  },
];
