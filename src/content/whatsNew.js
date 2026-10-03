// Log of shipped features, newest first. Add an entry here whenever a
// user-facing feature ships — the "New features" page (and the under-
// development banner's link to it) both read from this list.
export const WHATS_NEW = [
  {
    date: "2026-09-27",
    title: "Under-development notice",
    description:
      "A site-wide banner (shown while the REACT_APP_UNDER_DEVELOPMENT env var is on) links here so visitors can see what's shipped recently.",
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
