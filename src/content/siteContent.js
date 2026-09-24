import {
  Accessibility,
  BadgeCheck,
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Grid2x2,
  Landmark,
  ListPlus,
  MessageCircleQuestion,
  NotebookText,
  Printer,
  QrCode,
  Save,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
  SpellCheck2,
  Volume2,
} from "lucide-react";

// Long-form copy that used to live on the home page. Each page under
// /how-it-works, /for-educators and /faq renders its own slice of this.

// The "why use it" tiles on the home page (components/KeyFeatures.jsx). Only
// say here what the site does today: each line is checked against the code.
// `big` tiles lead the grid. `body` may be a function of { totalWords }.
export const KEY_FEATURES_HEADING = ["All the spelling practice.", "None of the sign-up."]; // one line each
export const KEY_FEATURES_LEDE =
  "Free for Reception to Year 6. It remembers where each child got to, works with any word list, and is built to be easy to read for everyone.";

export const KEY_FEATURES = [
  {
    id: "progress",
    big: true,
    icon: Save,
    title: "Progress saves itself",
    body: "Every word you practise is remembered on this device. Close the tab, come back tomorrow, and the words that need another go are waiting. No login.",
    to: "/how-it-works",
    cta: "See how a session works",
  },
  {
    id: "sync",
    big: true,
    icon: QrCode,
    title: "Take it to another device",
    body: "Save a backup as a file, a link or a QR code and open it on any other device. See what will change first, and undo it for ten minutes. Still no account.",
    to: "/sync",
    cta: "Save or move progress",
  },
  {
    id: "custom",
    big: true,
    icon: ListPlus,
    title: "Your words, your list",
    body: "Paste this week's school spellings and get a quiz, a word search, a crossword and print sheets for exactly those words. Lists stay on your device and travel with your backup.",
    to: "/custom",
    cta: "Make a list",
  },
  {
    id: "years",
    icon: GraduationCap,
    title: "Ready-made for every year",
    body: ({ totalWords }) =>
      (totalWords ? totalWords.toLocaleString("en-GB") + " words" : "Word lists") +
      " from Reception to Year 6, matched to the National Curriculum and laid out week by week. Reception starts with letter sounds.",
  },
  {
    id: "adaptive",
    icon: Brain,
    title: "Practice that adapts",
    body: "A six-box spaced-repetition system brings back the words you got wrong sooner, and lets the ones you know drop away.",
  },
  {
    id: "listen",
    icon: Volume2,
    title: "Hear it, then spell it",
    body: "Each word is read aloud by your device's voice, set to British English and slower for Reception. Or try \"Guess from the meaning\": a crossword-style clue, no audio.",
  },
  {
    id: "wordsearch",
    icon: Grid2x2,
    title: "Word searches and crosswords",
    body: "Word searches that fit the year, small and upright for the youngest children and bigger with diagonal and backwards words for older ones. Or solve a crossword made from the week's words, with clues from each word's sentence or meaning. Play on screen, or print one.",
  },
  {
    id: "paper",
    icon: Printer,
    title: "On screen or on paper",
    body: "Print the word list, a handwriting sheet, a word search or a crossword (with its answers on a second page), and follow the look, cover, write, check routine away from the screen.",
    to: "/offline-journey",
    cta: "See the paper routine",
  },
  {
    id: "dyslexia",
    icon: SpellCheck2,
    title: "Dyslexia-friendly",
    body: "A theme with a cream background, soft grey text and extra spacing, and a choice of Lexend or OpenDyslexic lettering.",
  },
  {
    id: "accessible",
    icon: Accessibility,
    title: "Easy to see and use",
    body: "A high-contrast theme, three text sizes, a reduce-motion switch that also follows your device, and clear outlines for keyboard use. The settings button is on every page.",
  },
  {
    id: "free",
    icon: BadgeCheck,
    title: "Free, with no sign-up",
    body: "Nothing to pay for and nothing to log in to. Open a year and start.",
  },
];

export const FEATURES = [
  {
    icon: Sparkles,
    title: "Practice",
    body: "Type each spelling, hear it read aloud, get instant feedback — with a spaced-repetition engine underneath, so words you got wrong come back sooner than ones you've nailed.",
  },
  {
    icon: Grid2x2,
    title: "Word search and crossword",
    body: "A wordsearch scaled to the year — small grids with no diagonals for the youngest years, bigger grids with backwards and diagonal placements once reading fluency catches up. Or a crossword built from the same words, with a clue for each one.",
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
    title: "Reinforce with a word search or crossword",
    body: "A wordsearch grid scaled to the year group — small and upright for the youngest years, bigger with backwards and diagonal words once reading fluency catches up. Or a crossword made from the week's words, where each clue is the word's example sentence with the word left blank, or its meaning. Print either one, or play it on screen.",
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
    body: "Type each word, hear it read aloud, get instant feedback. This is the first proper recall step — SRS-lite quietly tracks which words are shaky, so those are the ones that resurface soonest. Once the words feel familiar, the week's crossword is a good next step: it asks for each word from a clue, rather than from a list.",
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
    q: "Can I use the spellings my child's school sets?",
    a: "Yes. Choose \"Make your own spelling list\" (in the footer, or the last card with the years on the home page), paste the words, and you get a practice quiz, a word search, a crossword and print sheets for exactly those words. Where a word is in our year lists it also gets a meaning and a sentence. Lists stay on your device and are included when you save a backup.",
  },
  {
    q: "What is the spaced-repetition system (SRS-lite)?",
    a: "A simple six-box Leitner system. Every word starts in box one; get it right and it moves up a box with a longer gap before it's due again; get it wrong and it drops back down. Over time, practice naturally focuses on the words that still need it.",
  },
  {
    q: "What does SPELL// STARS include?",
    a: "Ready-made weekly lists for Reception to Year 6, and your own lists from any words you paste in. For each list there's a practice quiz (listen and spell, or guess from the meaning), a word search, a crossword and print sheets. Progress is saved as you go and can be backed up or moved to another device. There are dyslexia-friendly and high-contrast themes, three text sizes and a reduce-motion switch. It's free, with no account.",
  },
  {
    q: "Is it dyslexia-friendly and accessible?",
    a: "There's a dyslexia-friendly theme with a cream background, soft grey text and extra spacing, and you can choose Lexend or OpenDyslexic lettering. There's also a high-contrast theme, three text sizes and a reduce-motion switch, which starts from your device's own setting. Open the round settings button at the bottom left of any page; your choices are remembered on that device.",
  },
  {
    q: "Can it read the words aloud?",
    a: "Yes. Practice reads each word using your device's built-in voice, set to British English, and slower for Reception. You can replay it as often as you like. If a browser has no speech support the button says so, and \"Guess from the meaning\" works without sound for words that have a definition.",
  },
  {
    q: "How do the crosswords work?",
    a: "Each week's words make a crossword, and so does any list of your own. Every word gets a clue: by default the word's example sentence with the word blanked out, or you can switch to its meaning. Type into the grid, use the arrow keys or tap a clue to move about, and use Check, Reveal word or Reveal all if you get stuck. Press New puzzle for a fresh layout. You can print it too, and the printout has a second page with the answers. Where a term or a whole year has more than 15 words, each puzzle uses a different selection of them.",
  },
  {
    q: "Is it free?",
    a: "Yes. There's nothing to pay for and nothing to sign up to.",
  },
  {
    q: "Do I need an account?",
    a: "No. There's nothing to sign up for or log in to — open a year and start. Progress is kept in the browser on the device you practise on.",
  },
  {
    q: "Where is my child's progress saved?",
    a: "In the browser on the device they're practising on, so it carries over every time they come back on that device. Browsers can clear a site's saved data if it isn't used for a while, or if you clear your history, so it's worth saving a backup from the \"Save or move progress\" page (linked in the footer and the settings menu).",
  },
  {
    q: "How do I use it on another device, or back up progress?",
    a: "Open \"Save or move progress\" and choose a backup file, a link or a QR code, then open it on the other device. Your own spelling lists come with it. You'll see what would change before anything is saved, and you can undo it for ten minutes afterwards. The link holds the progress itself rather than storing it on a server, so anyone who has the link can see which words have been practised — send it only to people you trust. Once there's a lot of progress it won't fit in a QR code, and for a whole year the backup file is the safest choice.",
  },
  {
    q: "What happens if my child practises on two devices?",
    a: "Each device keeps its own progress until you combine them. Restoring a backup can merge the two, keeping the more practised record of each word, or replace what's on the device with the backup. The current week is left alone unless you choose to copy it.",
  },
  {
    q: "What should we do away from the screen?",
    a: "There's a five-step weekly routine: word search, the practice game, a printed sheet, look-cover-write-check, and a spoken test at the end. The digital journey and offline journey pages set out both halves, and every word search has a print button. The site needs an internet connection to load, so print the week's sheets first if you'll be offline.",
  },
  {
    q: "Do the words come with definitions and example sentences for every year?",
    a: "Reception, Year 1 and Year 2 have them for every word today. Years 3 to 6 are being filled in.",
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
    body: "Every word search and crossword has a print button for an offline worksheet (a crossword prints with an answers page for the grown-up), and the practice timer can switch to countdown mode for a bit of gentle pressure once a list is well known.",
  },
];

// /about: the story behind the site. Three things it stands for.
export const ABOUT_PILLARS = [
  {
    icon: BookOpen,
    title: "Know the word",
    body: "Where a word comes from and what it means is part of spelling it. Every word comes with its meaning and an example sentence, so it sticks.",
  },
  {
    icon: Printer,
    title: "Paper and pen still count",
    body: "Learning is moving online, and sometimes that's right. But writing by hand matters too, so everything can be printed and the site works offline as well as online.",
  },
  {
    icon: Accessibility,
    title: "Open to everyone",
    body: "Free, no sign-up, and built to be easy to read and use whatever your needs, with options for text size, colour, dyslexia-friendly type and reduced motion.",
  },
];
