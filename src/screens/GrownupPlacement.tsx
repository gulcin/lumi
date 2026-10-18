import { useMemo, useState } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { applyGrownupAnswers, selectPlacementPrompts, type GrownupMark } from "../lib/grownupPlacement";
import { ageLabel } from "../lib/catalog";
import type { Catalog, Progress } from "../lib/types";

export function GrownupPlacementScreen({
  catalog,
  progress,
  onCancel,
  onDone,
}: {
  catalog: Catalog;
  progress: Progress;
  onCancel: () => void;
  onDone: (progress: Progress) => void;
}) {
  const groups = useMemo(() => selectPlacementPrompts(catalog, progress.startGrade), [catalog, progress.startGrade]);
  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<Record<string, GrownupMark>>({});
  const group = groups[index];
  if (!group) return null;
  const ready = group.topics.every((topic) => marks[topic.id]);
  return (
    <Shell wide>
      <TopBar title="Starting point" onBack={onCancel} />
      <h1 data-testid="grownup-placement">Around grade {progress.startGrade}</h1>
      <p className="lede">
        {group.subject}. For each lesson, say whether this is already in place. Yep seeds that lesson and the hard steps beneath it. Not yet keeps those gaps on the path.
      </p>
      <p className="tiny muted">
        {index + 1} of {groups.length}
      </p>
      {group.topics.map((topic) => (
        <article key={topic.id} className="card">
          <h2>{topic.name}</h2>
          <p className="tiny muted">
            {ageLabel(topic)} · {topic.domain}
          </p>
          <p>{topic.description}</p>
          <div className="domain-row">
            {(
              [
                ["yep", "Yep"],
                ["getting", "Getting there"],
                ["notyet", "Not yet"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={marks[topic.id] === id ? "chip chip-on" : "chip"}
                onClick={() => setMarks((current) => ({ ...current, [topic.id]: id }))}
              >
                {label}
              </button>
            ))}
          </div>
        </article>
      ))}
      <button
        type="button"
        className="primary"
        disabled={!ready}
        onClick={() => {
          if (index + 1 < groups.length) {
            setIndex(index + 1);
            return;
          }
          const answers = Object.entries(marks).map(([topicId, mark]) => ({ topicId, mark }));
          onDone(applyGrownupAnswers(progress, catalog, answers, Date.now()));
        }}
      >
        {index + 1 < groups.length ? "Next subject" : "Set this starting point"}
      </button>
    </Shell>
  );
}
