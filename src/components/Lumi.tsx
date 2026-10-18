import type { Outfit } from "../lib/types";

export function Lumi({
  mood = "idle",
  className = "",
  wearing,
}: {
  mood?: "idle" | "happy" | "think" | "cheer";
  className?: string;
  wearing?: Outfit;
}) {
  return (
    <svg className={`lumi lumi-${mood} ${className}`} viewBox="0 0 160 150" role="img" aria-label="Lumi the fox">
      {wearing?.den === "den-stars" ? (
        <g aria-hidden="true">
          <circle cx="18" cy="22" r="2" fill="#f0b429" />
          <circle cx="140" cy="28" r="2.4" fill="#f0b429" />
          <circle cx="28" cy="48" r="1.6" fill="#fff6d0" />
        </g>
      ) : null}
      {wearing?.den === "den-leaves" ? (
        <g aria-hidden="true">
          <ellipse cx="22" cy="120" rx="14" ry="6" fill="#1f8a70" opacity="0.35" />
          <ellipse cx="138" cy="118" rx="12" ry="5" fill="#6e8b4a" opacity="0.4" />
        </g>
      ) : null}
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
      {wearing?.scarf === "scarf-teal" ? <path d="M58 108 Q80 118 102 108 L100 116 Q80 126 60 116 Z" fill="#1f8a70" /> : null}
      {wearing?.scarf === "scarf-gold" ? <path d="M58 108 Q80 118 102 108 L100 116 Q80 126 60 116 Z" fill="#f0b429" /> : null}
      {wearing?.glasses === "glasses-round" ? (
        <g fill="none" stroke="#3b2418" strokeWidth="2">
          <circle cx="64" cy="72" r="10" />
          <circle cx="96" cy="72" r="10" />
          <path d="M74 72 H86" />
        </g>
      ) : null}
      {wearing?.glasses === "glasses-star" ? (
        <g fill="none" stroke="#8c4a3a" strokeWidth="2">
          <path d="M54 72 L64 66 L74 72 L64 78 Z" />
          <path d="M86 72 L96 66 L106 72 L96 78 Z" />
        </g>
      ) : null}
      {wearing?.hat === "hat-cap" ? <path d="M48 58 Q80 28 112 58 L104 62 Q80 40 56 62 Z" fill="#3d7ea6" /> : null}
      {wearing?.hat === "hat-leaf" ? <ellipse cx="80" cy="40" rx="28" ry="10" fill="#1f8a70" /> : null}
      {wearing?.hat === "hat-star" ? <path d="M80 24 L86 42 L104 42 L90 52 L96 70 L80 58 L64 70 L70 52 L56 42 L74 42 Z" fill="#f0b429" /> : null}
    </svg>
  );
}
