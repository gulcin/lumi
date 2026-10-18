import { useEffect, useMemo } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { ageLabel } from "../lib/catalog";
import { journeyState, JOURNEY_LABEL } from "../lib/adaptive";
import { PYP_THEMES } from "../lib/pyp";
import { speak } from "../lib/speech";
import type { Catalog, Progress, PypThemeId, Topic } from "../lib/types";

export function ThemePathScreen({
  themeId,
  catalog,
  progress,
  speechOn,
  onBack,
  onOpen,
  onPlay,
}: {
  themeId: PypThemeId;
  catalog: Catalog;
  progress: Progress;
  speechOn: boolean;
  onBack: () => void;
  onOpen: (topic: Topic) => void;
  onPlay: () => void;
}) {
  const theme = PYP_THEMES.find((item) => item.id === themeId) ?? PYP_THEMES[0]!;
  const topics = useMemo(() => {
    return catalog.topics
      .filter((topic) => catalog.pypMap?.topics[topic.id]?.theme === themeId)
      .sort((a, b) => a.ageRangeStart - b.ageRangeStart || a.name.localeCompare(b.name));
  }, [catalog, themeId]);
  const line = `${theme.name}. ${theme.blurb}`;
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn, line]);
  const visible = topics.filter((topic) => {
    const state = journeyState(topic, catalog, progress);
    return state !== "coming" || topic.ageRangeStart <= (progress.placement?.bandEnd ?? 9) + 2;
  }).slice(0, 40);
  return (
    <Shell wide>
      <TopBar title={theme.name} onBack={onBack} speechOn={speechOn} onReplay={() => speak(line)} />
      <p className="lede">{theme.blurb}</p>
      <div className="legend" aria-label="Skill map legend">
        <span className="status status-mastered">{JOURNEY_LABEL.mastered}</span>
        <span className="status status-practicing">{JOURNEY_LABEL.working}</span>
        <span className="status status-later">{JOURNEY_LABEL.coming}</span>
      </div>
      <button type="button" className="primary" onClick={onPlay}>
        Play this theme
      </button>
      <div className="topic-list">
        {visible.map((topic) => {
          const state = journeyState(topic, catalog, progress);
          return (
            <button key={topic.id} type="button" className="topic-row" onClick={() => onOpen(topic)}>
              <span>
                <strong>{topic.name}</strong>
                <small>
                  {topic.domain}
                  {topic.origin === "lumi" ? " · Lumi addition" : ""} · {ageLabel(topic)}
                </small>
              </span>
              <em className={`status status-${state === "mastered" ? "mastered" : state === "working" ? "practicing" : "later"}`}>
                {JOURNEY_LABEL[state]}
              </em>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}
