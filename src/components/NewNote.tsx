import { useEffect, useRef } from "react";
import type { Outfit } from "../lib/types";
import { speak } from "../lib/speech";
import { Lumi } from "./Lumi";

export function NewNote({
  note,
  wearing,
  speechOn,
  onClose,
}: {
  note: string;
  wearing?: Outfit;
  speechOn: boolean;
  onClose: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    if (speechOn) speak(`New! ${note}`);
  }, [note, speechOn]);

  return (
    <div className="news-scrim">
      <div
        className="news-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kid-new-title"
        aria-describedby="kid-new-note"
        data-testid="kid-new"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Tab") {
            event.preventDefault();
            button.current?.focus();
          }
        }}
      >
        <Lumi mood="happy" wearing={wearing} eager />
        <h2 id="kid-new-title">New!</h2>
        <p id="kid-new-note" className="lede">
          {note}
        </p>
        <button ref={button} type="button" className="primary" data-testid="kid-new-ok" onClick={onClose}>
          Okay
        </button>
      </div>
    </div>
  );
}
