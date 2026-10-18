import { useEffect, useState } from "react";
import { Art } from "../components/Art";
import { Shell, TopBar } from "../components/Chrome";
import { THEME_ART } from "../lib/art";
import { ExerciseView } from "../components/ExerciseView";
import { Lumi } from "../components/Lumi";
import { frontierEnd } from "../lib/adaptive";
import { earnAcorn } from "../lib/acorns";
import { awardBadges } from "../lib/badges";
import { exerciseFromSeed, exerciseSpeak } from "../lib/generators";
import type { Exercise } from "../lib/generators/types";
import { inquiryFor } from "../lib/pyp";
import { applyAttempt, finishSession } from "../lib/progress";
import { chime, speak } from "../lib/speech";
import type { Catalog, LearnerTrait, Progress, PypThemeId } from "../lib/types";

const REFLECT = [
  { id: "new", label: "I found out something new", traits: ["reflective"] as LearnerTrait[] },
  { id: "explain", label: "I can tell someone about it", traits: ["reflective", "communicator"] as LearnerTrait[] },
  { id: "harder", label: "I want to try a harder one", traits: ["reflective", "risk-taker"] as LearnerTrait[] },
  { id: "care", label: "It helps me look after something", traits: ["reflective", "caring"] as LearnerTrait[] },
];

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
  const [phase, setPhase] = useState<"inquiry" | "ask" | "feedback" | "reflect">("inquiry");
  const [seen, setSeen] = useState<string[]>([]);
  const [given, setGiven] = useState<LearnerTrait[]>([]);
  const [lastTheme, setLastTheme] = useState<PypThemeId | undefined>();
  const [feedback, setFeedback] = useState<{ ok: boolean; explain: string } | null>(null);
  const item = active?.items[active.index];
  const topic = item ? catalog.byId.get(item.topicId) : undefined;
  const exercise: Exercise | null = item && topic ? exerciseFromSeed(topic, item.seed) : null;
  const themeId = topic ? catalog.pypMap?.topics[topic.id]?.theme : undefined;
  const inquiry = topic ? inquiryFor(topic, themeId) : null;
  const showInquiry = Boolean(topic && inquiry && phase === "inquiry" && !seen.includes(topic.id));
  const line = showInquiry
    ? inquiry?.spoken ?? ""
    : phase === "reflect"
      ? "What did you find out?"
      : feedback
        ? feedback.explain
        : exercise
          ? exerciseSpeak(exercise)
          : "Let's head home.";

  useEffect(() => {
    if (speechOn && line) speak(line);
  }, [speechOn, line]);

  useEffect(() => {
    if (!topic) return;
    if (!seen.includes(topic.id)) setPhase("inquiry");
    else setPhase("ask");
    setFeedback(null);
  }, [active?.index, seen, topic]);

  if (!active || !item || !topic || !exercise || !inquiry) {
    return (
      <Shell>
        <h1>That lesson closed.</h1>
        <button type="button" className="primary" onClick={onExit}>
          Home
        </button>
      </Shell>
    );
  }

  function grant(base: Progress, traits: LearnerTrait[], at: number, reason: string): Progress {
    const fresh = traits.filter((trait) => !given.includes(trait));
    if (!fresh.length) return base;
    setGiven((current) => [...current, ...fresh]);
    return awardBadges(base, fresh, at, reason);
  }

  function goNext(current: Progress) {
    const subjects = new Set(active!.items.map((step) => catalog.byId.get(step.topicId)?.subject).filter(Boolean));
    let withBadge = current;
    if (subjects.size > 1) withBadge = grant(current, ["balanced"], Date.now(), "mixed a lesson");
    if (active!.index + 1 >= active!.items.length) {
      const finished = finishSession(withBadge, Date.now());
      onProgress(finished.progress);
      onDone();
      return;
    }
    onProgress({ ...withBadge, active: { ...active!, index: active!.index + 1 } });
    setFeedback(null);
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
        {inquiry.themeName}
        {topic.origin === "lumi" ? " · Lumi addition" : ""} · {active.index + 1} of {active.items.length}
      </p>
      <div className="with-lumi">
        <Lumi
          mood={phase === "reflect" ? "think" : feedback ? (feedback.ok ? "happy" : "think") : showInquiry ? "listen" : "idle"}
          className="lumi-side"
          wearing={progress.wearing}
        />
        {showInquiry ? (
          <article className="card inquiry" data-testid="inquiry">
            <Art name={THEME_ART[inquiry.themeId]} alt="" className="scene-banner short" />
            <p className="pill">{inquiry.themeName}</p>
            <h2>{inquiry.wonder}</h2>
            <p>{inquiry.centralIdea}</p>
            <ul>
              {inquiry.lines.map((lineItem) => (
                <li key={lineItem}>{lineItem}</li>
              ))}
            </ul>
            <button
              type="button"
              className="primary"
              data-testid="inquiry-continue"
              onClick={() => {
                setSeen((current) => [...current, topic.id]);
                setPhase("ask");
              }}
            >
              Let's find out
            </button>
          </article>
        ) : null}
        {!showInquiry && phase === "reflect" ? (
          <div className="card" data-testid="reflect">
            <h2>What did you find out?</h2>
            <div className="choices">
              {REFLECT.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="choice"
                  onClick={() => {
                    const at = Date.now();
                    let next = grant(progress, choice.traits, at, choice.id);
                    const earned = earnAcorn(next, at, "reflect");
                    next = earned.progress;
                    setPhase("ask");
                    goNext(next);
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!showInquiry && phase !== "reflect" && feedback ? (
          <div className="feedback" data-testid="feedback" role="status">
            <h2>{feedback.ok ? "Yes!" : "Good try."}</h2>
            <p>{feedback.explain}</p>
            <button
              type="button"
              className="primary"
              data-testid="next"
              onClick={() => {
                if (feedback.explain.includes("mastered")) {
                  setPhase("reflect");
                  return;
                }
                goNext(progress);
              }}
            >
              {feedback.explain.includes("mastered") ? "What did you find out?" : active.index + 1 >= active.items.length ? "Finish" : "Next"}
            </button>
          </div>
        ) : null}
        {!showInquiry && phase !== "reflect" && !feedback ? (
          <ExerciseView
            exercise={exercise}
            e2e={e2e}
            onAnswer={(ok) => {
              const at = Date.now();
              const applied = applyAttempt(progress, {
                topicId: topic.id,
                correct: ok,
                sessionId: active.id,
                at,
                role: item.role,
              });
              const frontier = frontierEnd(catalog, progress);
              const traits: LearnerTrait[] = [];
              if (item.role === "explore") traits.push("inquirer");
              if (topic.ageRangeStart > frontier) traits.push("risk-taker");
              if (ok && topic.ageRangeStart >= frontier - 1) traits.push("thinker");
              if (ok && exercise.kind === "talk") traits.push("communicator");
              if (!ok) traits.push("principled");
              if (applied.newlyMastered) traits.push("knowledgeable");
              if (themeId && lastTheme && themeId !== lastTheme) traits.push("open-minded");
              if (ok && (themeId === "sharing-the-planet" || themeId === "who-we-are")) traits.push("caring");
              let next = grant(applied.progress, traits, at, topic.id);
              if (ok && exercise.kind !== "talk") {
                const earned = earnAcorn(next, at, "hands-on");
                next = earned.progress;
              }
              if (applied.newlyMastered) {
                const earned = earnAcorn(next, at + 1, "mastery", 3);
                next = earned.progress;
              }
              if (themeId) setLastTheme(themeId);
              const gained = (ok ? 1 : 0) + (applied.newlyMastered ? 3 : 0);
              const nextActive = {
                ...active,
                correct: active.correct + (ok ? 1 : 0),
                stars: active.stars + gained,
                newlyMastered: applied.newlyMastered ? [...active.newlyMastered, applied.newlyMastered] : active.newlyMastered,
              };
              onProgress({ ...next, active: nextActive });
              if (soundOn) chime(applied.newlyMastered ? "star" : ok ? "yes" : "no");
              const masteredLine = applied.newlyMastered ? ` You mastered ${topic.name}.` : "";
              setPhase("feedback");
              setFeedback({
                ok,
                explain: ok ? `${exercise.explain}${masteredLine}` : `Good try. ${exercise.explain}`,
              });
            }}
          />
        ) : null}
      </div>
    </Shell>
  );
}
