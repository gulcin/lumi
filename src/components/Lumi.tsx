export function Lumi({ mood = "idle", className = "" }: { mood?: "idle" | "happy" | "think" | "cheer"; className?: string }) {
  return (
    <svg className={`lumi lumi-${mood} ${className}`} viewBox="0 0 160 150" role="img" aria-label="Lumi the fox">
      <ellipse cx="80" cy="138" rx="36" ry="8" fill="rgba(90,48,24,.12)" />
      <path d="M38 58 L22 18 L62 42 Z" fill="#ef5d3c" />
      <path d="M122 58 L138 18 L98 42 Z" fill="#ef5d3c" />
      <path d="M46 46 L34 24 L58 40 Z" fill="#ffd7bf" />
      <path d="M114 46 L126 24 L102 40 Z" fill="#ffd7bf" />
      <circle cx="80" cy="78" r="42" fill="#ef5d3c" />
      <ellipse cx="80" cy="92" rx="24" ry="18" fill="#ffd7bf" />
      <circle cx="64" cy="72" r="5.5" fill="#3b2418" />
      <circle cx="96" cy="72" r="5.5" fill="#3b2418" />
      <circle cx="66" cy="70" r="1.6" fill="#fff" />
      <circle cx="98" cy="70" r="1.6" fill="#fff" />
      <ellipse cx="80" cy="88" rx="5" ry="3.4" fill="#3b2418" />
      <path d="M68 98 Q80 108 92 98" fill="none" stroke="#3b2418" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 108 Q80 122 112 108 L116 124 Q80 138 44 124 Z" fill="#c73545" />
      <path d="M74 108 L80 120 L86 108" fill="#f0b429" />
    </svg>
  );
}
