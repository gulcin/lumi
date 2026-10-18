import type { ReactNode } from "react";
import { Art } from "./Art";
import { Lumi } from "./Lumi";

export function Shell({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return <main className={wide ? "shell shell-wide" : "shell"}>{children}</main>;
}

export function TopBar({
  title,
  onBack,
  speechOn,
  onToggleSpeech,
  onReplay,
}: {
  title?: string;
  onBack?: () => void;
  speechOn?: boolean;
  onToggleSpeech?: () => void;
  onReplay?: () => void;
}) {
  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
          Back
        </button>
      ) : (
        <span className="topbar-mark">
          <Lumi className="lumi-tiny" />
        </span>
      )}
      <strong>{title}</strong>
      <span className="topbar-actions">
        {onReplay ? (
          <button type="button" className="icon-btn" onClick={onReplay} aria-label="Hear that again" data-testid="replay">
            Hear
          </button>
        ) : null}
        {onToggleSpeech ? (
          <button type="button" className="icon-btn" onClick={onToggleSpeech} aria-label={speechOn ? "Turn speech off" : "Turn speech on"} aria-pressed={speechOn}>
            {speechOn ? "Sound" : "Quiet"}
          </button>
        ) : null}
      </span>
    </header>
  );
}

export function Stars({ count }: { count: number }) {
  return (
    <p className="star-line" aria-label={`${count} stars`}>
      <Art name="wear/hat-star" alt="" className="star-mark" />
      {count} {count === 1 ? "star" : "stars"}
    </p>
  );
}

export function FooterNote({ text }: { text: string }) {
  return (
    <footer className="legal">
      <p>{text}</p>
      <p>Lumi stores progress only on this device. No ads. No tracking. No accounts.</p>
    </footer>
  );
}
