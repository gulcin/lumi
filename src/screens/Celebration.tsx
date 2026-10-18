import { useEffect } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { Lumi } from "../components/Lumi";
import { speak } from "../lib/speech";
import type { Catalog, Progress } from "../lib/types";

export function CelebrationScreen({
  catalog,
  progress,
  speechOn,
  onHome,
  onAgain,
  onExplore,
  onJournal,
}: {
  catalog: Catalog;
  progress: Progress;
  speechOn: boolean;
  onHome: () => void;
  onAgain: () => void;
  onExplore: () => void;
  onJournal?: () => void;
}) {
  const session = progress.sessions[0];
  const names = (session?.masteredTopicIds ?? [])
    .map((id) => catalog.byId.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  const line = !session
    ? "Every open lesson on your path is already a star skill. You can explore any topic on the map."
    : names.length
      ? `You did it. ${session.stars} stars. New star ${names.length === 1 ? "skill" : "skills"}: ${names.join(", ")}.`
      : `You did it. ${session.correct} of ${session.total} correct, and ${session.stars} stars. See you next time.`;

  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn, line]);

  return (
    <Shell>
      <TopBar title="You did it" onReplay={() => speak(line)} speechOn={speechOn} />
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.08}s` }} />
        ))}
      </div>
      <Lumi mood="cheer" />
      <h1 data-testid="celebration">{names.length ? "A new star skill!" : "Lesson done."}</h1>
      <p className="lede">{line}</p>
      {names.length ? (
        <ul className="mastered-banner" data-testid="mastered-banner">
          {names.map((name) => (
            <li key={name}>★ {name}</li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="primary" data-testid="again" onClick={onAgain}>
        Another lesson
      </button>
      <button type="button" className="secondary" onClick={onExplore}>
        Explore the map
      </button>
      {onJournal ? (
        <button type="button" className="secondary" onClick={onJournal}>
          Show what you made
        </button>
      ) : null}
      <button type="button" className="ghost" onClick={onHome}>
        Home
      </button>
    </Shell>
  );
}
