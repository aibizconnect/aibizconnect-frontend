/**
 * ToolThumb — a designed graphic banner for each tool card (Revven-style: rich
 * artwork fills the top of the card, then title + description below). NO emojis.
 * Pure SVG: a brand-tinted gradient mesh + soft glow + an abstract, professional
 * motif per tool type. Renders crisp at any size and needs no image assets/keys.
 */

type Motif =
  | "doc" | "chart" | "play" | "calendar" | "people" | "wave"
  | "frame" | "device" | "brain" | "hook" | "book";

const W = "rgba(255,255,255,0.92)";
const W6 = "rgba(255,255,255,0.6)";
const W3 = "rgba(255,255,255,0.32)";

function Motif({ motif }: { motif: Motif }) {
  switch (motif) {
    case "doc":
      return (
        <g fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round">
          <rect x="118" y="34" width="84" height="104" rx="8" fill="rgba(255,255,255,0.10)" stroke={W6} />
          <line x1="134" y1="58" x2="186" y2="58" />
          <line x1="134" y1="76" x2="186" y2="76" stroke={W6} />
          <line x1="134" y1="92" x2="172" y2="92" stroke={W6} />
          <line x1="134" y1="108" x2="186" y2="108" stroke={W3} />
          <circle cx="196" cy="44" r="9" fill={W} stroke="none" opacity="0.9" />
        </g>
      );
    case "chart":
      return (
        <g fill="none" stroke={W} strokeWidth="2.4" strokeLinecap="round">
          <line x1="120" y1="138" x2="200" y2="138" stroke={W6} />
          <rect x="128" y="98" width="14" height="40" rx="3" fill="rgba(255,255,255,0.16)" stroke={W6} />
          <rect x="150" y="78" width="14" height="60" rx="3" fill="rgba(255,255,255,0.24)" stroke={W6} />
          <rect x="172" y="58" width="14" height="80" rx="3" fill="rgba(255,255,255,0.32)" stroke={W6} />
          <polyline points="128,108 150,90 172,96 192,62" stroke={W} />
          <circle cx="192" cy="62" r="4.5" fill={W} stroke="none" />
        </g>
      );
    case "play":
      return (
        <g fill="none" stroke={W6} strokeWidth="2.2">
          <rect x="112" y="44" width="96" height="84" rx="10" fill="rgba(255,255,255,0.10)" />
          <circle cx="160" cy="86" r="22" fill="rgba(255,255,255,0.16)" stroke={W} />
          <path d="M153 75 L173 86 L153 97 Z" fill={W} stroke="none" />
        </g>
      );
    case "calendar":
      return (
        <g fill="none" stroke={W6} strokeWidth="2">
          <rect x="116" y="42" width="88" height="92" rx="9" fill="rgba(255,255,255,0.10)" stroke={W} />
          <line x1="116" y1="64" x2="204" y2="64" stroke={W} />
          <line x1="138" y1="36" x2="138" y2="50" stroke={W} />
          <line x1="182" y1="36" x2="182" y2="50" stroke={W} />
          {[78, 98, 118].map((y) => [128, 148, 168, 188].map((x, j) => (
            <rect key={`${x}-${y}`} x={x - 6} y={y - 6} width="12" height="12" rx="2.5"
              fill={(x + y) % 3 === 0 ? W : "rgba(255,255,255,0.18)"} stroke="none" />
          )))}
        </g>
      );
    case "people":
      return (
        <g fill="none" stroke={W} strokeWidth="2.2">
          <circle cx="140" cy="74" r="16" fill="rgba(255,255,255,0.18)" stroke={W6} />
          <path d="M116 126 a24 24 0 0 1 48 0" stroke={W6} />
          <circle cx="184" cy="80" r="13" fill="rgba(255,255,255,0.12)" stroke={W3} />
          <path d="M166 124 a18 18 0 0 1 36 0" stroke={W3} />
        </g>
      );
    case "wave":
      return (
        <g fill="none" stroke={W} strokeWidth="2.6" strokeLinecap="round">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const x = 120 + i * 10;
            const h = [22, 40, 30, 56, 36, 60, 28, 44][i];
            return <line key={i} x1={x} y1={86 - h / 2} x2={x} y2={86 + h / 2} stroke={i % 2 ? W6 : W} />;
          })}
        </g>
      );
    case "frame":
      return (
        <g fill="none" stroke={W6} strokeWidth="2.2">
          <rect x="116" y="44" width="88" height="84" rx="10" fill="rgba(255,255,255,0.10)" stroke={W} />
          <circle cx="142" cy="70" r="8" fill={W} stroke="none" opacity="0.85" />
          <path d="M122 122 L150 92 L168 110 L182 96 L198 122 Z" fill="rgba(255,255,255,0.22)" stroke={W6} />
          <path d="M196 50 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill={W} stroke="none" />
        </g>
      );
    case "device":
      return (
        <g fill="none" stroke={W} strokeWidth="2.2">
          <rect x="138" y="38" width="44" height="96" rx="9" fill="rgba(255,255,255,0.12)" stroke={W6} />
          <line x1="152" y1="46" x2="168" y2="46" stroke={W6} />
          <rect x="148" y="60" width="24" height="24" rx="4" fill="rgba(255,255,255,0.22)" stroke="none" />
          <line x1="148" y1="96" x2="172" y2="96" stroke={W3} />
          <line x1="148" y1="108" x2="164" y2="108" stroke={W3} />
        </g>
      );
    case "brain":
      return (
        <g fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round">
          <path d="M150 56 a20 20 0 0 0 -18 30 a16 16 0 0 0 10 26 a16 16 0 0 0 26 0 a16 16 0 0 0 10 -26 a20 20 0 0 0 -18 -30 z" fill="rgba(255,255,255,0.12)" stroke={W6} />
          <line x1="160" y1="58" x2="160" y2="112" stroke={W6} />
          <circle cx="143" cy="84" r="3.4" fill={W} stroke="none" />
          <circle cx="177" cy="92" r="3.4" fill={W} stroke="none" />
          <circle cx="160" cy="74" r="3.4" fill={W} stroke="none" />
        </g>
      );
    case "hook":
      return (
        <g fill="none" stroke={W} strokeWidth="2.6" strokeLinecap="round">
          <path d="M160 44 L160 96 a16 16 0 1 1 -16 -16" fill="none" stroke={W} />
          <circle cx="160" cy="42" r="4.5" fill={W} stroke="none" />
          <path d="M150 64 l20 0" stroke={W3} />
        </g>
      );
    case "book":
      return (
        <g fill="none" stroke={W} strokeWidth="2.2">
          <path d="M160 52 C146 44 128 44 120 50 L120 122 C128 116 146 116 160 124 Z" fill="rgba(255,255,255,0.10)" stroke={W6} />
          <path d="M160 52 C174 44 192 44 200 50 L200 122 C192 116 174 116 160 124 Z" fill="rgba(255,255,255,0.18)" stroke={W6} />
          <line x1="160" y1="52" x2="160" y2="124" stroke={W} />
        </g>
      );
  }
}

export const TOOL_MOTIF: Record<string, Motif> = {
  persona: "people", email: "doc", social: "calendar", newsletter: "doc",
  hooks: "hook", "brand-voice": "wave", "business-plan": "chart",
  vsl: "play", ebook: "book", "perfect-hire": "people", deck: "chart",
  "app-designer": "device", "sora-prompt": "play", "prompt-coach": "brain",
  "business-coach": "brain", logo: "frame", vector: "frame",
  "avatar-video": "play", music: "wave", "book-cover": "book",
  "coloring-book": "frame", "morph-me": "frame", transcription: "wave", "web-scraper": "device",
};

export default function ToolThumb({ toolKey, grad, locked }: { toolKey: string; grad: string; locked?: boolean }) {
  const motif = TOOL_MOTIF[toolKey] || "doc";
  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gradient-to-br ${grad} ${locked ? "grayscale-[35%]" : ""}`}>
      {/* soft glows */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/25 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-black/20 blur-2xl" />
      <svg viewBox="0 0 320 172" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {/* faint grid for depth */}
        <defs>
          <pattern id={`g-${toolKey}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0 L0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="320" height="172" fill={`url(#g-${toolKey})`} />
        <g transform="translate(0,8)"><Motif motif={motif} /></g>
      </svg>
    </div>
  );
}
