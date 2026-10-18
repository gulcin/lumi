import { useEffect, useState } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { ExerciseView } from "../components/ExerciseView";
import { Lumi } from "../components/Lumi";
import { exerciseFromSeed, exerciseSpeak } from "../lib/generators";
import type { Exercise } from "../lib/generators/types";
import { applyAttempt, finishSession } from "../lib/progress";
import { chime, speak } from "../lib/speech";
import type { Catalog, Progress } from "../lib/types";

export function SessionScreen({
  catalog,
  progress,
  e2e,
  speechOn,
  soundOn,
  onToggleSpeech,
  onProgress,
  onExit,
  onDone,
}: {
  catalog: Catalog;
  progress: Progress;
  e2e: boolean;
  speechOn: boolean;
  soundOn: boolean;
  onToggleSpeech: () => void;
  onProgress: (progress: Progress) => void;
  onExit: () => void;
  onDone: () => void;
}) {
  const active = progress.active;
  const [feedback, setFeedback] = useState<{ ok: boolean; explain: string } | null>(null);
  const item = active?.items[active.index];
  const topic = item ? catalog.byId.get(item.topicId) : undefined;
  const exercise: Exercise | null = item && topic ? exerciseFromSeed(topic, item.seed) : null;
  const line = feedback ? feedback.explain : exercise ? exerciseSpeak(exercise) : "Let's head home.";

  useEffect(() => {
    if (speechOn && line) speak(line);
  }, [speechOn, line]);

  if (!active || !item || !topic || !exercise) {
    return (
      <Shell>
        <h1>That lesson closed.</h1>
        <button type="button" className="primary" onClick={onExit}>
          Home
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBar
        title={topic.name}
        onBack={onExit}
        speechOn={speechOn}
        onToggleSpeech={onToggleSpeech}
        onReplay={() => speak(line)}
      />
      <div className="pips" aria-label={`Step ${active.index + 1} of ${active.items.length}`}>
        {active.items.map((step, i) => (
          <span key={`${step.topicId}-${i}`} className={i < active.index ? "on" : i === active.index ? "now" : ""} />
        ))}
      </div>
      <p className="muted tiny">
        {active.index + 1} of {active.items.length} · ★ {active.stars}
      </p>
      <div className="with-lumi">
        <Lumi mood={feedback ? (feedback.ok ? "happy" : "think") : "idle"} className="lumi-side" />
        {feedback ? (
          <div className="feedback" data-testid="feedback" role="status">
            <h2>{feedback.ok ? "Yes!" : "Good try."}</h2>
            <p>{feedback.explain}</p>
            <button
              type="button"
              className="primary"
              data-testid="next"
              onClick={() => {
                if (active.index + 1 >= active.items.length) {
                  const finished = finishSession(progress, Date.now());
                  onProgress(finished.progress);
                  onDone();
                  return;
                }
                onProgress({ ...progress, active: { ...active, index: active.index + 1 } });
                setFeedback(null);
              }}
            >
              {active.index + 1 >= active.items.length ? "Finish" : "Next"}
            </button>
          </div>
        ) : (
          <ExerciseView
            exercise={exercise}
            e2e={e2e}
            onAnswer={(ok) => {
              const applied = applyAttempt(progress, {
                topicId: topic.id,
                correct: ok,
                sessionId: active.id,
                at: Date.now(),
                role: item.role,
              });
              const gained = (ok ? 1 : 0) + (applied.newlyMastered ? 3 : 0);
              const nextActive = {
                ...active,
                correct: active.correct + (ok ? 1 : 0),
                stars: active.stars + gained,
                newlyMastered: applied.newlyMastered
                  ? [...active.newlyMastered, applied.newlyMastered]
                  : active.newlyMastered,
              };
              onProgress({ ...applied.progress, active: nextActive });
              if (soundOn) chime(applied.newlyMastered ? "star" : ok ? "yes" : "no");
              const masteredLine = applied.newlyMastered ? ` You mastered ${topic.name}.` : "";
              setFeedback({
                ok,
                explain: ok ? `${exercise.explain}${masteredLine}` : `Good try. ${exercise.explain}`,
              });
            }}
          />
        )}
      </div>
    </Shell>
  );
}
