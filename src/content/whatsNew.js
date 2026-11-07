// Log of shipped features, newest first. Add an entry here whenever a
// user-facing feature ships — the "New features" page (and the under-
// development banner's link to it) both read from this list.
export const WHATS_NEW = [
  {
    date: "2026-11-08",
    title: "Install it as an app",
    description:
      "SPELL// STARS can now be installed on your computer, so it opens in its own window and keeps working offline once you have visited a few pages. In Chrome or Edge use the install icon in the address bar (or \"Install as an app\" in the footer); in Safari choose File, then Add to Dock.",
  },
  {
    date: "2026-11-07",
    title: "Choose individual words for a lesson",
    description:
      "On the spelling rules page, tap any word to add it to your lesson. Every word that fits a pattern is a tile you can pick, and each rule has a \"Choose words\" dropdown for that week's words. Chosen words always go in, and any rules you add fill the rest of the count. You can also type or paste your own words, one per line or separated by commas, and make a lesson from chosen or typed words alone.",
  },
  {
    date: "2026-11-07",
    title: "Search by spelling rule, lessons and series",
    description:
      "A new \"Search by spelling rule\" section on the home page opens a page listing every spelling rule from Reception to Year 6. Filter by pattern (/ee/, -le ending, kn-) or topic, pick one or more rules, and create a lesson with practice, a word search, a crossword and print sheets. Lessons can be grouped into a named series, such as \"Child 1, Year 1\", and series are included in backups.",
  },
  {
    date: "2026-09-27",
    title: "Under-development notice",
    description:
      "A site-wide banner (shown while the REACT_APP_UNDER_DEVELOPMENT env var is on) links here so visitors can see what's shipped recently.",
  },
  {
    date: "2026-10-03",
    title: "Badges and status levels",
    description:
      "Every correct answer now earns a point, and points build into one of nine status levels, from Letter Explorer up to an uncapped Galaxy rank, each with its own animal badge. Finishing crosswords and word searches also earns milestone, gold-star and speed badges. See them all on the new \"My progress\" page, in the learner menu next to the site name.",
  },
  {
    date: "2026-10-03",
    title: "Tick off the offline routine for real",
    description:
      "Each week's card now has an \"Offline routine\" checklist — printed word search, printed crossword, look-cover-write-check and a verbal test. Ticking a step counts those words as practised and feeds the same badges a digital crossword or word search would, so paper practice isn't just a reminder any more.",
  },
   {
    date: "2026-01-04",
    title: "Add and assign users",
    description:
      "You can now add users to the site as learned and select who is using the tool. Their activities will be stored against the selected user and count towards that users badges. ",
  },
  {
    date: "2026-10-03",
    title: "Tick off crossword clues as you go",
    description:
      "Printable crosswords now have an empty checkbox next to each clue number, so you can mark a clue off on paper as soon as you've filled it in.",
  },
  {
    date: "2026-10-03",
    title: "Write the words out first",
    description:
      "Printable crosswords now end with a lined section for writing out all of the week's words before you start, with a tip to cross each one off as you use it in the grid \u2014 it makes the crossword a bit easier and gets in some extra writing practice.",
  },
];

/** The newest date in the log, as YYYY-MM-DD (the site's "last updated"). */
export const LAST_UPDATED = WHATS_NEW.reduce((latest, item) => (item.date > latest ? item.date : latest), "");

/** "7 Nov 2026" from "2026-11-07". */
export const formatShortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
