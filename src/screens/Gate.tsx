import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { speak } from "../lib/speech";

export function GateScreen({ speechOn, onCancel, onOpen }: { speechOn: boolean; onCancel: () => void; onOpen: () => void }) {
  const [hold, setHold] = useState(0);
  const [entry, setEntry] = useState("");
  const [note, setNote] = useState("");
  const frame = useRef<number | null>(null);
  const line = "Grown-ups, press and hold the button for three seconds. Or answer 19 plus 8.";
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn]);

  const stop = () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setHold(0);
  };
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* Synthetic events in tests have no pointer capture. */
    }
    const began = performance.now();
    const tick = (now: number) => {
      const value = Math.min(1, (now - began) / 3000);
      setHold(value);
      if (value >= 1) {
        stop();
        onOpen();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  return (
    <Shell>
      <TopBar title="Grown-ups" onBack={onCancel} onReplay={() => speak(line)} speechOn={speechOn} />
      <h1>A moment for grown-ups</h1>
      <p className="lede">Press and hold until the ring fills.</p>
      <button
        type="button"
        className="hold"
        data-testid="gate-hold"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
      >
        <span className="hold-ring" style={{ background: `conic-gradient(#ef5d3c ${hold * 360}deg, #ffd7c2 0deg)` }} />
        Hold
      </button>
      <form
        className="gate-sum"
        onSubmit={(event) => {
          event.preventDefault();
          if (Number(entry) === 27) onOpen();
          else setNote("Not quite. You can hold the button instead.");
        }}
      >
        <label>
          Or what is 19 + 8?
          <input inputMode="numeric" value={entry} onChange={(event) => setEntry(event.target.value)} />
        </label>
        <button type="submit" className="secondary">
          Open
        </button>
      </form>
      {note ? <p role="status">{note}</p> : null}
    </Shell>
  );
}
