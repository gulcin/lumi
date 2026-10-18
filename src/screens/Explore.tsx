import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { ageLabel } from "../lib/catalog";
import { speak } from "../lib/speech";
import { topicStatus } from "../lib/adaptive";
import type { Catalog, Progress, Topic, TopicStatus } from "../lib/types";

const TINT: Record<string, string> = {
  Mathematics: "#e07a3d",
  English: "#1f8a70",
  Science: "#3d7ea6",
  History: "#8c4a3a",
  "Life Skills": "#c4922a",
  "Personal & Social Development": "#c46b8a",
  Computing: "#5c6b8a",
  "Learning to Learn": "#6e8b4a",
};

const BLURB: Record<string, string> = {
  Mathematics: "Numbers, shapes, and patterns",
  English: "Words, stories, and sentences",
  Science: "How the world works",
  History: "People and places long ago",
  "Life Skills": "Money, plans, and everyday know-how",
  "Personal & Social Development": "Feelings, friends, and choices",
  Computing: "Patterns in technology",
  "Learning to Learn": "How you learn",
};

const STATUS_LABEL: Record<TopicStatus, string> = {
  mastered: "Star skill",
  practicing: "Practising",
  ready: "Ready",
  later: "Bigger step",
  earlier: "Earlier step",
};

export function ExploreScreen({
  catalog,
  progress,
  speechOn,
  onBack,
  onOpen,
}: {
  catalog: Catalog;
  progress: Progress;
  speechOn: boolean;
  onBack: () => void;
  onOpen: (topic: Topic) => void;
}) {
  const [subject, setSubject] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const line = subject
    ? `${subject}. ${BLURB[subject] ?? "Pick a lesson."}`
    : "This is the whole map. Pick a subject, or search for any lesson.";

  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn, line]);

  const domains = subject ? catalog.domainsBySubject.get(subject) ?? [] : [];
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.topics.filter((topic) => {
      if (subject && topic.subject !== subject) return false;
      if (domain && topic.domain !== domain) return false;
      if (!q) return Boolean(subject);
      return `${topic.name} ${topic.domain} ${topic.description}`.toLowerCase().includes(q);
    });
  }, [catalog, subject, domain, query]);

  return (
    <Shell wide>
      <TopBar title="Explore" onBack={onBack} speechOn={speechOn} onReplay={() => speak(line)} />
      <label className="field">
        <span className="sr">Search lessons</span>
        <input
          value={query}
          placeholder="Search all lessons"
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(40);
          }}
        />
      </label>
      <div className="subject-grid">
        {catalog.subjects.map((item) => (
          <button
            key={item}
            type="button"
            className={item === subject ? "subject on" : "subject"}
            style={{ "--tint": TINT[item] ?? "#ef5d3c" } as CSSProperties}
            onClick={() => {
              setSubject(item === subject ? null : item);
              setDomain(null);
              setLimit(40);
            }}
          >
            <strong>{item}</strong>
            <span>{BLURB[item] ?? "Lessons"}</span>
          </button>
        ))}
      </div>
      {domains.length ? (
        <div className="domain-row">
          <button type="button" className={!domain ? "chip chip-on" : "chip"} onClick={() => setDomain(null)}>
            All
          </button>
          {domains.map((item) => (
            <button key={item} type="button" className={domain === item ? "chip chip-on" : "chip"} onClick={() => setDomain(item)}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      {subject || query.trim() ? (
        <div className="topic-list">
          {results.slice(0, limit).map((topic) => {
            const status = topicStatus(topic, catalog, progress);
            return (
              <button key={topic.id} type="button" className="topic-row" onClick={() => onOpen(topic)}>
                <span>
                  <strong>{topic.name}</strong>
                  <small>
                    {topic.domain} · {ageLabel(topic)}
                  </small>
                </span>
                <em className={`status status-${status}`}>{STATUS_LABEL[status]}</em>
              </button>
            );
          })}
          {results.length === 0 ? <p className="muted">Nothing matches that yet. Try another word.</p> : null}
          {results.length > limit ? (
            <button type="button" className="ghost" onClick={() => setLimit((value) => value + 40)}>
              Show more ({results.length - limit} left)
            </button>
          ) : null}
        </div>
      ) : (
        <p className="lede">Every subject in the Marble curriculum is here. Nothing is locked away from you.</p>
      )}
    </Shell>
  );
}

export function TopicPeek({
  topic,
  catalog,
  progress,
  speechOn,
  onBack,
  onStart,
}: {
  topic: Topic;
  catalog: Catalog;
  progress: Progress;
  speechOn: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const status = topicStatus(topic, catalog, progress);
  const line = `${topic.name}. ${topic.description}`;
  useEffect(() => {
    if (speechOn) speak(`${topic.name}. ${status === "later" ? "This is a bigger step. You can still try it." : "Let's try it."}`);
  }, [speechOn, topic.name, status]);
  return (
    <Shell>
      <TopBar title={topic.subject} onBack={onBack} onReplay={() => speak(line)} speechOn={speechOn} />
      <p className={`status status-${status}`}>{STATUS_LABEL[status]}</p>
      <h1>{topic.name}</h1>
      <p className="muted">
        {topic.domain} · {ageLabel(topic)}
      </p>
      <p className="lede">{topic.description}</p>
      {status === "later" ? <p>Some earlier lessons usually come first. You can still try this one.</p> : null}
      <button type="button" className="primary" data-testid="start-topic" onClick={onStart}>
        Try this lesson
      </button>
    </Shell>
  );
}
