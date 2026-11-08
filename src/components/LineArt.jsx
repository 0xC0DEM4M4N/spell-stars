// Outline illustrations for the long-form pages. Line drawings only (no
// fills), in the theme's ink colour with one accent colour for the detail
// that matters, so they work in the light, dark, dyslexia and high-contrast
// themes. Decoration: hidden from screen readers and never carrying meaning.
//
//   <LineArt name="journeys" />

const INK = "hsl(var(--foreground))";
const ACCENT = "hsl(var(--primary))";

const base = { fill: "none", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" };
const ink = { ...base, stroke: INK, strokeOpacity: 0.85 };
const accent = { ...base, stroke: ACCENT };

const star = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push((cx + radius * Math.cos(a)).toFixed(1) + " " + (cy + radius * Math.sin(a)).toFixed(1));
  }
  return "M" + pts.join("L") + "Z";
};

const Sparkle = ({ x, y, s = 7 }) => <path d={`M${x} ${y - s}v${s * 2}M${x - s} ${y}h${s * 2}`} {...accent} strokeWidth={2.5} />;

const DRAWINGS = {
  // A laptop and a sheet of paper: the two ways to practise.
  journeys: (
    <>
      <rect x="14" y="44" width="118" height="82" rx="9" {...ink} />
      <path d="M4 136h138l-7 14H11z" {...ink} />
      <path d="M34 66h52M34 84h74M34 102h38" {...ink} strokeOpacity={0.45} />
      <path d="M34 66h52" {...accent} />
      <path d="M94 102v12" {...accent} />
      <g transform="rotate(5 200 90)">
        <rect x="160" y="30" width="82" height="112" rx="9" {...ink} />
        <path d="M176 62h50M176 82h50M176 102h30" {...ink} strokeOpacity={0.45} strokeDasharray="1 9" />
      </g>
      <g transform="rotate(38 232 150)">
        <rect x="224" y="108" width="15" height="62" rx="3" {...accent} />
        <path d="M224 170l7.5 14 7.5-14" {...accent} />
      </g>
      <path d="M140 62c10-26 26-26 18-2" {...accent} strokeDasharray="2 8" />
      <Sparkle x={150} y={26} />
    </>
  ),
  // Five steps up to a star.
  steps: (
    <>
      <path d="M12 176h46v-30h46v-30h46v-30h46v-30h50" {...ink} />
      <path d="M26 160l7 7 13-15M72 130l7 7 13-15M118 100l7 7 13-15M164 70l7 7 13-15" {...accent} />
      <path d={star(222, 30, 24)} {...accent} />
      <Sparkle x={186} y={22} s={6} />
      <Sparkle x={248} y={64} s={5} />
    </>
  ),
  // An open book with a magnifier over a letter pattern.
  book: (
    <>
      <path d="M120 60C92 44 54 44 22 56v104c32-12 70-12 98 6 28-18 66-18 98-6V56c-32-12-70-12-98 4z" {...ink} />
      <path d="M120 60v106" {...ink} />
      <path d="M42 82h56M42 102h48M42 122h56" {...ink} strokeOpacity={0.45} />
      <circle cx="182" cy="96" r="30" {...accent} />
      <path d="M204 118l24 24" {...accent} strokeWidth={5} />
      <text x="182" y="106" textAnchor="middle" fontFamily="Lexend, system-ui, sans-serif" fontWeight="800" fontSize="26" fill={ACCENT}>ee</text>
    </>
  ),
  // A calendar with one week picked out.
  calendar: (
    <>
      <rect x="34" y="38" width="190" height="140" rx="14" {...ink} />
      <path d="M34 74h190M84 24v26M174 24v26" {...ink} />
      {[0, 1, 2, 3].map((c) =>
        [0, 1].map((r) => (
          <rect key={c + "-" + r} x={52 + c * 44} y={92 + r * 38} width="30" height="24" rx="6" {...ink} strokeOpacity={0.35} strokeWidth={2.5} />
        )),
      )}
      <rect x="52" y="130" width="162" height="24" rx="6" {...accent} />
      <path d="M62 142l6 6 11-12" {...accent} />
      <Sparkle x={236} y={40} s={6} />
    </>
  ),
  // A worksheet with a pencil and a speech bubble: paper and out loud.
  pencil: (
    <>
      <rect x="28" y="40" width="130" height="140" rx="10" {...ink} />
      <path d="M48 76h90M48 100h90M48 124h60" {...ink} strokeOpacity={0.45} strokeDasharray="1 9" />
      <path d="M48 76h40" {...accent} />
      <g transform="rotate(40 198 150)">
        <rect x="190" y="104" width="16" height="64" rx="3" {...accent} />
        <path d="M190 168l8 15 8-15" {...accent} />
      </g>
      <path d="M170 22h66a10 10 0 0 1 10 10v26a10 10 0 0 1-10 10h-34l-14 14v-14h-18a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10z" {...ink} />
      <text x="205" y="53" textAnchor="middle" fontFamily="Lexend, system-ui, sans-serif" fontWeight="800" fontSize="19" fill={INK} fillOpacity="0.85">abc</text>
    </>
  ),
  // A heart with a star inside: who it is for.
  heart: (
    <>
      <path d="M130 172C62 124 40 86 66 60c24-22 54-8 64 14 10-22 40-36 64-14 26 26 4 64-64 112z" {...ink} />
      <path d={star(130, 106, 24)} {...accent} />
      <Sparkle x={54} y={30} />
      <Sparkle x={214} y={36} s={6} />
    </>
  ),
  // A big outline star with a few sparkles.
  star: (
    <>
      <path d={star(130, 98, 70)} {...accent} />
      <path d="M130 70v26l18 12" {...ink} strokeOpacity={0} />
      <Sparkle x={34} y={52} />
      <Sparkle x={228} y={40} s={6} />
      <Sparkle x={214} y={158} s={5} />
      <circle cx="46" cy="150" r="5" {...ink} />
    </>
  ),
};

export function LineArt({ name, className = "" }) {
  const drawing = DRAWINGS[name];
  if (!drawing) return null;
  return (
    <svg viewBox="0 0 260 200" className={className} role="presentation" aria-hidden="true" focusable="false">
      {drawing}
    </svg>
  );
}
