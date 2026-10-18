import { useEffect, useState } from "react";
import { PYP_AREAS, PYP_NOTE, PYP_THEMES } from "../lib/pyp";
import { buildDailyNotes } from "../lib/parentNote";
import { fetchChat, loadSyncMeta, polishNote, syncConfigured } from "../lib/syncClient";
import type { Catalog, Progress } from "../lib/types";

export function ThemeProgress({ catalog, progress }: { catalog: Catalog; progress: Progress }) {
  const rows = PYP_THEMES.map((theme) => {
    const topics = catalog.topics.filter((topic) => catalog.pypMap?.topics[topic.id]?.theme === theme.id);
    const mastered = topics.filter((topic) => progress.topics[topic.id]?.mastered).length;
    return { ...theme, total: topics.length, mastered };
  });
  const areas = PYP_AREAS.map((area) => {
    const topics = catalog.topics.filter((topic) => catalog.pypMap?.topics[topic.id]?.area === area.id);
    const mastered = topics.filter((topic) => progress.topics[topic.id]?.mastered).length;
    return { ...area, total: topics.length, mastered };
  });
  return (
    <section data-testid="parent-themes">
      <h2>By PYP theme</h2>
      <div className="tallies">
        {rows.map((row) => (
          <article key={row.id} className="card">
            <header>
              <strong>
                {row.emoji} {row.name}
              </strong>
              <span>
                {row.mastered}/{row.total}
              </span>
            </header>
            <div className="track" aria-hidden="true">
              <span style={{ width: `${row.total ? (row.mastered / row.total) * 100 : 0}%` }} />
            </div>
          </article>
        ))}
      </div>
      <h2>By subject area</h2>
      <div className="tallies">
        {areas.map((row) => (
          <article key={row.id} className="card">
            <header>
              <strong>{row.name}</strong>
              <span>
                {row.mastered}/{row.total}
              </span>
            </header>
            <div className="track" aria-hidden="true">
              <span style={{ width: `${row.total ? (row.mastered / row.total) * 100 : 0}%` }} />
            </div>
          </article>
        ))}
      </div>
      <p className="tiny muted">{PYP_NOTE}</p>
    </section>
  );
}

export function TodayPanel({ catalog, progress }: { catalog: Catalog; progress: Progress }) {
  const notes = buildDailyNotes(progress, catalog, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [polished, setPolished] = useState<Record<string, string>>({});
  const code = syncConfigured() ? loadSyncMeta().familyCode : undefined;
  if (!notes.length) return <p data-testid="daily-note">No finished lesson yet today. A note appears after a session.</p>;
  return (
    <section data-testid="daily-note">
      {notes.map((note) => (
        <article key={note.day} className="note">
          <h2>
            {note.day} · Today {progress.childName} explored…
          </h2>
          <p>{polished[note.day] ?? note.narrative}</p>
          <p className="tiny muted">
            {note.minutes} min · {note.topicNames.length} lessons
            {note.themes.length ? ` · ${note.themes.join(", ")}` : ""}
          </p>
          <h3>Off the screen</h3>
          <ul>
            {note.ideas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
          {code ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                void polishNote(code, note.narrative).then((text) => setPolished((current) => ({ ...current, [note.day]: text })));
              }}
            >
              Polish the wording
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function ChatLog({ progress }: { progress: Progress }) {
  const [lines, setLines] = useState<{ role: string; content: string; createdAt: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const code = loadSyncMeta().familyCode;
    if (!syncConfigured() || !code) return;
    void fetchChat(code, progress.childKey).then((messages) => {
      setLines(messages);
      setLoaded(true);
    });
  }, [progress.childKey]);
  if (!syncConfigured()) return null;
  return (
    <section>
      <h2>What {progress.childName} asked</h2>
      {!loaded ? <p className="muted">Loading…</p> : null}
      {loaded && lines.length === 0 ? <p className="muted">No questions yet.</p> : null}
      <ul className="reason-list">
        {lines.map((line, index) => (
          <li key={`${line.createdAt}-${index}`}>
            <strong>{line.role === "user" ? progress.childName : "Lumi"}</strong>
            <p>{line.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
