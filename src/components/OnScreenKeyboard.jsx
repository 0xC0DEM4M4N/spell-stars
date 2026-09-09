// A QWERTY-laid-out on-screen keyboard — same relative key positions as
// a real keyboard, so a child using this to learn where a letter lives
// can find the same key on a physical keyboard later (and vice versa).
// Purely a layout: it doesn't own any styling or press-handling itself,
// it just arranges whatever `renderKey(letter)` gives back for each key
// into the standard three offset rows. That keeps it reusable for any
// letter-picking task (Reception's "find the letter" listening mode
// today; a future typed-answer keyboard for touch devices could reuse
// the same layout).
const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export const OnScreenKeyboard = ({ renderKey }) => (
  <div className="flex flex-col items-center gap-1.5 sm:gap-2" data-testid="on-screen-keyboard">
    {KEYBOARD_ROWS.map((row, rowIndex) => (
      <div
        key={rowIndex}
        className="flex gap-1.5 sm:gap-2"
        style={rowIndex > 0 ? { marginLeft: `${rowIndex * 14}px` } : undefined}
      >
        {row.map((letter) => (
          <div key={letter}>{renderKey(letter)}</div>
        ))}
      </div>
    ))}
  </div>
);
