import { useEffect, useState } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { ExerciseView } from "../components/ExerciseView";
import { Lumi } from "../components/Lumi";
import { PLACEMENT_ITEMS } from "../lib/placement";
import { exerciseSpeak } from "../lib/generators/types";
import { chime, speak } from "../lib/speech";

export function PlacementScreen({
  e2e,
  speechOn,
  soundOn,
  onCancel,
  onFinish,
}: {
  e2e: boolean;
  speechOn: boolean;
  soundOn: boolean;
  onCancel: () => void;
  onFinish: (correct: number, total: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; explain: string } | null>(null);
  const exercise = PLACEMENT_ITEMS[index];
  const line = feedback ? feedback.explain : exercise ? exerciseSpeak(exercise) : "";

  useEffect(() => {
    if (speechOn && line) speak(line);
  }, [speechOn, line]);

  if (!exercise) return null;

  return (
    <Shell>
      <TopBar title="Finding your level" onBack={onCancel} speechOn={speechOn} onReplay={() => speak(line)} />
      <div className="pips" aria-label={`Question ${index + 1} of ${PLACEMENT_ITEMS.length}`}>
        {PLACEMENT_ITEMS.map((item, i) => (
          <span key={item.id} className={i < index ? "on" : i === index ? "now" : ""} />
        ))}
      </div>
      <div className="with-lumi">
        <Lumi mood={feedback ? (feedback.ok ? "happy" : "think") : "think"} className="lumi-side" />
        {feedback ? (
          <div className="feedback" data-testid="feedback" role="status">
            <h2>{feedback.ok ? "Yes!" : "Good try."}</h2>
            <p>{feedback.explain}</p>
            <button
              type="button"
              className="primary"
              data-testid="next"
              onClick={() => {
                const next = index + 1;
                if (next >= PLACEMENT_ITEMS.length) onFinish(correct, PLACEMENT_ITEMS.length);
                else {
                  setIndex(next);
                  setFeedback(null);
                }
              }}
            >
              {index + 1 >= PLACEMENT_ITEMS.length ? "See where we start" : "Next"}
            </button>
          </div>
        ) : (
          <ExerciseView
            exercise={exercise}
            e2e={e2e}
            onAnswer={(ok) => {
              if (ok) setCorrect((value) => value + 1);
              if (soundOn) chime(ok ? "yes" : "no");
              setFeedback({ ok, explain: exercise.explain });
            }}
          />
        )}
      </div>
    </Shell>
  );
}
