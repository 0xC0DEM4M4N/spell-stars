// Header illustrations for the inner pages. Each one is a small SVG drawn in
// the current theme's colours (ink, card, cyan) plus the brand's amber star,
// so they suit the light, dark, dyslexia and high-contrast themes alike.
// They are decoration only: aria-hidden, and never carry information.
//
//   <PageArt name="rules" />            full size (300 wide), for page headers
//   <PageArt name="year" size={96} />   compact, for headers that hold controls

const INK = "hsl(var(--foreground))";
const CARD = "hsl(var(--card))";
const ACCENT = "hsl(var(--primary))";
const AMBER = "#fbbf24";
const AMBER_EDGE = "#b45309";

const starPath = (r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push((radius * Math.cos(a)).toFixed(2) + " " + (radius * Math.sin(a)).toFixed(2));
  }
  return "M" + pts.join("L") + "Z";
};

const Star = ({ x, y, r = 22 }) => (
  <path d={starPath(r)} transform={`translate(${x} ${y})`} fill={AMBER} stroke={AMBER_EDGE} strokeWidth="1.5" strokeLinejoin="round" />
);

const Sparkle = ({ x, y, s = 7, w = 2.5 }) => (
  <path d={`M${x} ${y - s}v${s * 2}M${x - s} ${y}h${s * 2}`} stroke={ACCENT} strokeWidth={w} strokeLinecap="round" />
);

const Panel = ({ x, y, w, h, r = 14, accent = false, rotate, opacity = 0.28 }) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={r}
    fill={CARD}
    stroke={accent ? ACCENT : INK}
    strokeOpacity={accent ? 1 : opacity}
    strokeWidth={accent ? 2 : 1.5}
    transform={rotate ? `rotate(${rotate} ${x + w / 2} ${y + h / 2})` : undefined}
  />
);

const Bar = ({ x, y, w, h = 7, o = 0.22, c = INK }) => <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} fillOpacity={o} />;

const Tick = ({ x, y }) => <path d={`M${x} ${y}l5 5 10-11`} stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;

const Letter = ({ x, y, size = 26, children, fill = INK }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Lexend, system-ui, sans-serif" fontWeight="800" fontSize={size} fill={fill}>
    {children}
  </text>
);

const ART = {
  updates: (
    <>
      <Panel x={62} y={22} w={206} h={64} rotate={5} opacity={0.2} />
      <Panel x={44} y={58} w={206} h={64} rotate={-3} />
      <Panel x={28} y={104} w={226} h={84} r={16} accent />
      <rect x={28} y={104} width={7} height={84} rx={3.5} fill={ACCENT} />
      <circle cx={62} cy={132} r={11} fill={ACCENT} fillOpacity={0.18} stroke={ACCENT} strokeWidth={1.5} />
      <path d="M62 126v12M56 132h12" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" />
      <Bar x={84} y={124} w={96} h={9} o={0.55} />
      <Bar x={48} y={152} w={188} />
      <Bar x={48} y={167} w={140} />
      <Star x={238} y={38} r={26} />
      <Sparkle x={26} y={46} s={7} />
      <circle cx={274} cy={82} r={3} fill={AMBER} />
    </>
  ),
  howItWorks: (
    <>
      <path d="M62 70H150M150 70H238" stroke={INK} strokeOpacity={0.35} strokeWidth={2.5} strokeDasharray="2 8" strokeLinecap="round" />
      {[62, 150, 238].map((cx, i) => (
        <g key={cx}>
          <circle cx={cx} cy={70} r={26} fill={CARD} stroke={i === 2 ? ACCENT : INK} strokeOpacity={i === 2 ? 1 : 0.35} strokeWidth={2} />
          <Letter x={cx} y={80} size={26} fill={i === 2 ? ACCENT : INK}>{i + 1}</Letter>
          <Panel x={cx - 40} y={116} w={80} h={62} r={12} accent={i === 2} />
          <Bar x={cx - 28} y={130} w={56} />
          <Bar x={cx - 28} y={144} w={40} />
          <Bar x={cx - 28} y={158} w={48} />
        </g>
      ))}
      <Star x={252} y={34} r={16} />
      <Sparkle x={24} y={30} />
    </>
  ),
  digital: (
    <>
      <Panel x={50} y={18} w={200} h={128} r={14} accent />
      <rect x={62} y={30} width={176} height={92} rx={8} fill={ACCENT} fillOpacity={0.08} />
      {["c", "a", "t"].map((l, i) => (
        <g key={l}>
          <rect x={78 + i * 50} y={52} width={40} height={46} rx={9} fill={CARD} stroke={ACCENT} strokeWidth={2} />
          <Letter x={98 + i * 50} y={86} size={30}>{l}</Letter>
        </g>
      ))}
      <path d="M130 146v22M170 146v22M108 170h84" stroke={INK} strokeOpacity={0.4} strokeWidth={3} strokeLinecap="round" />
      <Panel x={70} y={176} w={160} h={26} r={8} />
      <Star x={252} y={28} r={20} />
      <Sparkle x={30} y={36} />
    </>
  ),
  offline: (
    <>
      <Panel x={58} y={14} w={160} h={186} r={10} rotate={-4} />
      <g transform="rotate(-4 138 107)">
        <Bar x={78} y={44} w={110} h={8} o={0.5} />
        {[76, 98, 120, 142, 164].map((y) => (
          <path key={y} d={`M78 ${y}H198`} stroke={INK} strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="1 5" strokeLinecap="round" />
        ))}
        <Letter x={102} y={72} size={22} fill={ACCENT}>wr</Letter>
      </g>
      <g transform="rotate(38 232 110)">
        <rect x={214} y={40} width={26} height={130} rx={5} fill={AMBER} stroke={AMBER_EDGE} strokeWidth={1.5} />
        <path d="M214 170l13 26 13-26z" fill={CARD} stroke={AMBER_EDGE} strokeWidth={1.5} strokeLinejoin="round" />
        <rect x={214} y={40} width={26} height={16} rx={5} fill={ACCENT} />
      </g>
      <Sparkle x={28} y={40} />
    </>
  ),
  educators: (
    <>
      <Panel x={72} y={28} w={156} h={170} r={14} accent />
      <rect x={118} y={14} width={64} height={28} rx={8} fill={INK} fillOpacity={0.75} />
      <circle cx={150} cy={24} r={5} fill={CARD} />
      {[70, 108, 146].map((y, i) => (
        <g key={y}>
          <rect x={92} y={y} width={20} height={20} rx={5} fill="none" stroke={INK} strokeOpacity={0.4} strokeWidth={1.8} />
          {i < 2 && <Tick x={96} y={y + 11} />}
          <Bar x={124} y={y + 3} w={84 - i * 14} h={8} o={0.5} />
          <Bar x={124} y={y + 15} w={60} h={6} />
        </g>
      ))}
      <Star x={246} y={50} r={20} />
      <Sparkle x={34} y={60} />
    </>
  ),
  faq: (
    <>
      <path d="M44 28h140a14 14 0 0 1 14 14v58a14 14 0 0 1-14 14H108l-28 24v-24H44a14 14 0 0 1-14-14V42a14 14 0 0 1 14-14z" fill={CARD} stroke={ACCENT} strokeWidth={2} />
      <Letter x={114} y={96} size={56} fill={ACCENT}>?</Letter>
      <path d="M118 120h138a14 14 0 0 1 14 14v40a14 14 0 0 1-14 14h-20v22l-26-22h-92a14 14 0 0 1-14-14v-40a14 14 0 0 1 14-14z" fill={CARD} stroke={INK} strokeOpacity={0.3} strokeWidth={1.5} transform="translate(0 4)" />
      <Bar x={140} y={144} w={96} h={8} o={0.45} />
      <Bar x={140} y={162} w={70} />
      <Star x={252} y={34} r={18} />
    </>
  ),
  about: (
    <>
      <path d="M150 62C128 48 90 46 52 54v120c38-8 76-6 98 8z" fill={CARD} stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      <path d="M150 62c22-14 60-16 98-8v120c-38-8-76-6-98 8z" fill={CARD} stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      <path d="M150 62v120" stroke={ACCENT} strokeWidth={2} />
      {[82, 102, 122, 142].map((y) => (
        <g key={y}>
          <Bar x={70} y={y} w={62 - (y % 3) * 6} o={0.3} h={6} />
          <Bar x={170} y={y} w={62 - (y % 4) * 5} o={0.3} h={6} />
        </g>
      ))}
      <Star x={150} y={26} r={22} />
      <Sparkle x={36} y={34} />
      <Sparkle x={266} y={40} s={6} />
    </>
  ),
  feedback: (
    <>
      <path d="M54 26h192a16 16 0 0 1 16 16v82a16 16 0 0 1-16 16H128l-38 32v-32H54a16 16 0 0 1-16-16V42a16 16 0 0 1 16-16z" fill={CARD} stroke={ACCENT} strokeWidth={2} />
      <Bar x={62} y={50} w={130} h={8} o={0.5} />
      <Bar x={62} y={68} w={170} />
      <Bar x={62} y={82} w={110} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={starPath(13)} transform={`translate(${82 + i * 34} 120)`} fill={i < 4 ? AMBER : "none"} stroke={i < 4 ? AMBER_EDGE : INK} strokeOpacity={i < 4 ? 1 : 0.4} strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      <Sparkle x={272} y={26} s={6} />
    </>
  ),
  custom: (
    <>
      <Panel x={64} y={18} w={172} h={176} r={14} accent />
      {[44, 80, 116, 152].map((y, i) => (
        <g key={y}>
          <circle cx={90} cy={y + 8} r={6} fill={ACCENT} fillOpacity={i === 3 ? 0 : 0.25} stroke={ACCENT} strokeWidth={1.5} strokeDasharray={i === 3 ? "3 3" : undefined} />
          <Bar x={108} y={y + 3} w={96 - i * 10} h={9} o={i === 3 ? 0.15 : 0.5} />
        </g>
      ))}
      <circle cx={236} cy={164} r={26} fill={ACCENT} />
      <path d="M236 152v24M224 164h24" stroke={CARD} strokeWidth={4} strokeLinecap="round" />
      <Star x={58} y={36} r={16} />
    </>
  ),
  rules: (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={28 + i * 52} y={150} width={44} height={44} rx={10} fill={CARD} stroke={INK} strokeOpacity={0.3} strokeWidth={1.5} />
          <Letter x={50 + i * 52} y={181} size={24} fill={i === 1 ? ACCENT : INK}>{["s", "ee", "d"][i]}</Letter>
        </g>
      ))}
      <circle cx={178} cy={86} r={58} fill={ACCENT} fillOpacity={0.08} stroke={ACCENT} strokeWidth={4} />
      <path d="M220 128l46 50" stroke={ACCENT} strokeWidth={14} strokeLinecap="round" />
      <path d="M220 128l46 50" stroke={CARD} strokeWidth={4} strokeLinecap="round" strokeOpacity={0.5} />
      <Letter x={178} y={106} size={60} fill={INK}>ee</Letter>
      <Star x={250} y={36} r={20} />
      <Sparkle x={30} y={50} />
    </>
  ),
  series: (
    <>
      <Panel x={30} y={40} w={150} h={96} r={14} rotate={-6} opacity={0.2} />
      <Panel x={64} y={52} w={150} h={96} r={14} rotate={-2} opacity={0.3} />
      <Panel x={98} y={70} w={170} h={110} r={16} accent />
      <circle cx={128} cy={100} r={13} fill={ACCENT} />
      <Letter x={128} y={108} size={18} fill={CARD}>1</Letter>
      <Bar x={152} y={92} w={86} h={9} o={0.55} />
      <Bar x={152} y={108} w={60} />
      <Bar x={118} y={138} w={130} />
      <Bar x={118} y={153} w={96} />
      <path d="M236 70v34l10-8 10 8V70z" fill={AMBER} stroke={AMBER_EDGE} strokeWidth={1.5} strokeLinejoin="round" />
      <Sparkle x={36} y={170} />
    </>
  ),
  sync: (
    <>
      <Panel x={26} y={46} w={130} h={92} r={10} accent />
      <path d="M12 150h158l-10 14H22z" fill={CARD} stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      <Bar x={42} y={66} w={70} h={8} o={0.5} />
      <Bar x={42} y={84} w={96} />
      <Bar x={42} y={98} w={60} />
      <Panel x={214} y={52} w={56} h={112} r={12} accent />
      <Bar x={226} y={74} w={32} />
      <Bar x={226} y={90} w={24} />
      <circle cx={242} cy={152} r={4} fill={ACCENT} />
      <path d="M168 84h34m-9-9 9 9-9 9" stroke={INK} strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M202 124h-34m9-9-9 9 9 9" stroke={ACCENT} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Star x={150} y={22} r={16} />
    </>
  ),
  year: (
    <>
      <Panel x={30} y={24} w={240} h={168} r={16} accent />
      <path d="M30 70h240" stroke={ACCENT} strokeWidth={2} />
      <rect x={30} y={24} width={240} height={46} rx={16} fill={ACCENT} fillOpacity={0.14} />
      <Bar x={52} y={40} w={80} h={10} o={0.6} />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3, 4].map((c) => (
          <rect key={r + "-" + c} x={52 + c * 42} y={86 + r * 26} width={30} height={16} rx={5} fill={r === 1 && c === 2 ? AMBER : INK} fillOpacity={r === 1 && c === 2 ? 1 : 0.14} />
        ))
      )}
      <Star x={252} y={30} r={18} />
    </>
  ),
  progress: (
    <>
      <path d="M30 190h250" stroke={INK} strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
      {[56, 92, 128, 164, 200].map((h, i) => (
        <rect key={i} x={40 + i * 50} y={190 - h * 0.78} width={34} height={h * 0.78} rx={8} fill={i === 4 ? ACCENT : CARD} stroke={ACCENT} strokeWidth={2} fillOpacity={i === 4 ? 0.9 : 1} />
      ))}
      <Star x={225} y={36} r={24} />
      <Sparkle x={34} y={50} />
      <Sparkle x={286} y={112} s={6} />
    </>
  ),
  origins: (
    <>
      <circle cx={130} cy={104} r={78} fill={ACCENT} fillOpacity={0.08} stroke={ACCENT} strokeWidth={2.5} />
      <ellipse cx={130} cy={104} rx={32} ry={78} fill="none" stroke={ACCENT} strokeWidth={2} strokeOpacity={0.6} />
      <path d="M52 104h156M64 62h132M64 146h132" stroke={ACCENT} strokeWidth={2} strokeOpacity={0.6} />
      <rect x={190} y={96} width={72} height={86} rx={12} fill={CARD} stroke={INK} strokeOpacity={0.35} strokeWidth={1.5} />
      <Letter x={226} y={140} size={44} fill={ACCENT}>A</Letter>
      <Bar x={202} y={156} w={48} h={6} />
      <Star x={236} y={44} r={18} />
    </>
  ),
  list: (
    <>
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => (
          <g key={r + "-" + c}>
            <rect x={30 + c * 80} y={50 + r * 70} width={68} height={54} rx={12} fill={CARD} stroke={r === 0 && c === 1 ? ACCENT : INK} strokeOpacity={r === 0 && c === 1 ? 1 : 0.3} strokeWidth={r === 0 && c === 1 ? 2.5 : 1.5} />
            <Bar x={44 + c * 80} y={72 + r * 70} w={40} h={8} o={0.5} />
            <Bar x={44 + c * 80} y={88 + r * 70} w={26} h={6} />
          </g>
        ))
      )}
      <Star x={248} y={32} r={20} />
      <Sparkle x={34} y={26} />
    </>
  ),
};

/** The path a page lives at, mapped to its illustration. */
export const ART_BY_PATH = {
  "/account": "sync",
  "/privacy": "about",
  "/how-it-works": "howItWorks",
  "/digital-journey": "digital",
  "/offline-journey": "offline",
  "/for-educators": "educators",
  "/faq": "faq",
  "/about": "about",
  "/feedback": "feedback",
  "/custom": "custom",
  "/rules": "rules",
  "/series": "series",
  "/sync": "sync",
  "/whats-new": "updates",
};

export function PageArt({ name, size = 300 }) {
  const art = ART[name];
  if (!art) return null;
  return (
    <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 300 210" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      {art}
    </svg>
  );
}
