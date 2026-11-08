import { recordAttempt, revertAttempt } from "../srs";

const empty = { currentWeek: 1, words: {} };

describe("revertAttempt", () => {
  test("restores the exact earlier state when nothing came after", () => {
    const first = recordAttempt(empty, "w", true, "2026-01-01");
    const second = recordAttempt(first, "w", true, "2026-01-02");
    expect(revertAttempt(second, "w", first.words.w)).toEqual(first);
  });

  test("removes a word that had never been practised", () => {
    const one = recordAttempt(empty, "w", true, "2026-01-01");
    expect(revertAttempt(one, "w", null).words.w).toBeUndefined();
  });

  test("keeps later practice, winding back only one attempt", () => {
    const first = recordAttempt(empty, "w", true, "2026-01-01");
    const ticked = recordAttempt(first, "w", true, "2026-01-02");
    const later = recordAttempt(ticked, "w", true, "2026-01-03");
    const out = revertAttempt(later, "w", first.words.w).words.w;
    expect(out.attempts).toBe(2);
    expect(out.correctCount).toBe(2);
  });
});
