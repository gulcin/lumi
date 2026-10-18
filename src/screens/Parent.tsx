import { useMemo, useState } from "react";
import { FooterNote, Shell, TopBar } from "../components/Chrome";
import { ageLabel, clusterBlurb } from "../lib/catalog";
import { explainTopic, frontierEnd, subjectTallies, topicStatus, upcomingLocked, whatsNext, JOURNEY_LABEL, journeyState } from "../lib/adaptive";
import { hasHandsOn } from "../lib/generators";
import { clampGrade, gradeAnchorAge, levelCopy, placementFromScore, MIN_START_GRADE, MAX_START_GRADE } from "../lib/placement";
import { exportProgress, importProgress } from "../lib/progress";
import { syncConfigured } from "../lib/syncClient";
import { ATTRIBUTION, type Catalog, type Progress, type Topic } from "../lib/types";
import { Art } from "../components/Art";
import { INTEREST_ART } from "../lib/art";
import { INTERESTS } from "../lib/interests";
import { PYP_NOTE, themeOf } from "../lib/pyp";
import { buildInfo, versionLabel } from "../lib/buildInfo";
import { checkForUpdates } from "../lib/swUpdates";
import { ReportList } from "../components/TellUs";
import { SyncPanel } from "./SyncPanel";
import { ChatLog, ThemeProgress, TodayPanel } from "./ParentExtra";
import { WhatsNew } from "./WhatsNew";

export function ParentScreen({
  catalog,
  progress,
  onBack,
  onProgress,
  onRename,
  onPlacement,
  onJournal,
}: {
  catalog: Catalog;
  progress: Progress;
  onBack: () => void;
  onProgress: (progress: Progress) => void;
  onRename: (name: string) => void;
  onPlacement: () => void;
  onJournal: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "news" | "themes" | "today" | "map" | "history" | "backup" | "reports">("overview");
  const [updateNote, setUpdateNote] = useState("");
  const [checking, setChecking] = useState(false);
  const tabs = [
    ["overview", "Overview"],
    ["news", "What's new"],
    ["themes", "PYP themes"],
    ["today", "Today"],
    ["map", "Prerequisite map"],
    ["history", "Sessions"],
    ["backup", "Backup"],
    ["reports", "Reports"],
  ] as const;
  return (
    <Shell wide>
      <TopBar title="Grown-up view" onBack={onBack} />
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "chip chip-on" : "chip"} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <p className="version-stamp" data-testid="app-version">
        {versionLabel(buildInfo)}
      </p>
      <button
        type="button"
        className="secondary"
        data-testid="check-updates"
        disabled={checking}
        onClick={() => {
          setChecking(true);
          void checkForUpdates().then((note) => {
            setUpdateNote(note);
            setChecking(false);
          });
        }}
      >
        {checking ? "Looking…" : "Check for updates"}
      </button>
      {updateNote ? (
        <p className="muted" role="status" data-testid="update-status">
          {updateNote}
        </p>
      ) : null}
      {tab === "overview" ? <Overview catalog={catalog} progress={progress} onProgress={onProgress} onPlacement={onPlacement} /> : null}
      {tab === "news" ? <WhatsNew /> : null}
      {tab === "themes" ? <ThemeProgress catalog={catalog} progress={progress} /> : null}
      {tab === "today" ? <TodayPanel catalog={catalog} progress={progress} /> : null}
      {tab === "map" ? <MapView catalog={catalog} progress={progress} onProgress={onProgress} /> : null}
      {tab === "history" ? (
        <>
          <History catalog={catalog} progress={progress} />
          <ChatLog progress={progress} />
          <button type="button" className="secondary" onClick={onJournal}>
            Photo journal on this device
          </button>
        </>
      ) : null}
      {tab === "backup" ? <Backup progress={progress} onProgress={onProgress} onRename={onRename} /> : null}
      {tab === "reports" ? (
        <section>
          <h1>Notes for us</h1>
          <ReportList />
        </section>
      ) : null}
      <FooterNote text={ATTRIBUTION} />
    </Shell>
  );
}

function Overview({
  catalog,
  progress,
  onProgress,
  onPlacement,
}: {
  catalog: Catalog;
  progress: Progress;
  onProgress: (progress: Progress) => void;
  onPlacement: () => void;
}) {
  const tallies = subjectTallies(catalog, progress);
  const next = whatsNext(catalog, progress, hasHandsOn, 5);
  const locked = upcomingLocked(catalog, progress, 4);
  const frontier = progress.placement ? frontierEnd(catalog, progress) : null;
  return (
    <section data-testid="parent-root">
      <h1>{progress.childName}'s path</h1>
      {progress.placement ? (
        <>
          <p className="lede">{levelCopy(progress.placement.level, progress.placement.startGrade ?? progress.startGrade)}</p>
          <p className="muted">
            Warm-up: {progress.placement.correct} of {progress.placement.total}. Skills wholly at or below age{" "}
            {progress.placement.assumedThroughAge} are treated as already in place. The path starts near grade{" "}
            {progress.startGrade} (about age {gradeAnchorAge(progress.startGrade)}). If a later lesson is shaky, its
            missing prerequisites come back into practice. Frontier age is {frontier}. Mastery raises it with no cap.
          </p>
        </>
      ) : (
        <p>No warm-up yet. The map below still lists the whole curriculum.</p>
      )}
      <label className="field">
        Starting grade
        <select
          data-testid="start-grade"
          value={progress.startGrade}
          onChange={(event) => {
            const startGrade = clampGrade(Number(event.target.value));
            const placement = progress.placement
              ? placementFromScore(progress.placement.correct, progress.placement.total, Date.now(), startGrade)
              : undefined;
            onProgress({ ...progress, startGrade, placement });
          }}
        >
          {Array.from({ length: MAX_START_GRADE - MIN_START_GRADE + 1 }, (_, index) => MIN_START_GRADE + index).map((grade) => (
            <option key={grade} value={grade}>
              Grade {grade} · about age {gradeAnchorAge(grade)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="secondary" onClick={onPlacement}>
        Grown-up starting check
      </button>
      <h2>Interests</h2>
      <p className="tiny muted">These steer the next lesson inside the current frontier. They never skip a prerequisite.</p>
      <div className="domain-row">
        {INTERESTS.map((interest) => {
          const on = progress.interests.includes(interest.id);
          return (
            <button
              key={interest.id}
              type="button"
              className={on ? "chip chip-on" : "chip"}
              onClick={() => {
                const interests = on ? progress.interests.filter((id) => id !== interest.id) : [...progress.interests, interest.id].slice(0, 12);
                onProgress({ ...progress, interests });
              }}
            >
              <Art name={INTEREST_ART[interest.id] ?? "spots/acorn"} alt="" className="chip-art" />
              {interest.label}
            </button>
          );
        })}
      </div>
      <p className="tiny muted">{PYP_NOTE}</p>
      <div className="tallies">
        {tallies.map((row) => (
          <article key={row.subject} className="card">
            <header>
              <strong>{row.subject}</strong>
              <span>
                {row.mastered}/{row.total}
              </span>
            </header>
            <div className="track" aria-hidden="true">
              <span style={{ width: `${row.total ? (row.mastered / row.total) * 100 : 0}%` }} />
            </div>
            <p className="tiny muted">
              {row.practicing} practising · {row.ready} ready now
            </p>
          </article>
        ))}
      </div>
      <h2>What's next, and why</h2>
      {next.length === 0 ? <p className="muted">Finish the warm-up to see a suggested path.</p> : null}
      <ul className="reason-list">
        {next.map((item) => (
          <li key={item.topic.id}>
            <strong>
              {item.topic.name} <small>({ageLabel(item.topic)})</small>
            </strong>
            <p>{item.readyBecause.join(" ") || "Ready to practise."}</p>
            {clusterBlurb(catalog, item.topic) ? <p className="tiny muted">{clusterBlurb(catalog, item.topic)}</p> : null}
          </li>
        ))}
      </ul>
      <h2>Waiting on a prerequisite</h2>
      <ul className="reason-list">
        {locked.map((item) => (
          <li key={item.topic.id}>
            <strong>{item.topic.name}</strong>
            {item.blockedReasons.slice(0, 2).map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </li>
        ))}
      </ul>
      <h2>Mastered</h2>
      <MasteredList catalog={catalog} progress={progress} />
    </section>
  );
}

function MasteredList({ catalog, progress }: { catalog: Catalog; progress: Progress }) {
  const mastered = Object.entries(progress.topics)
    .filter(([, state]) => state.mastered)
    .map(([id, state]) => ({ topic: catalog.byId.get(id), at: state.masteredAt ?? 0 }))
    .filter((row): row is { topic: Topic; at: number } => Boolean(row.topic))
    .sort((a, b) => b.at - a.at);
  if (!mastered.length) return <p className="muted">No mastered skills yet. They show up here after steady success across sessions, or if you mark one.</p>;
  return (
    <ul className="reason-list" data-testid="mastered-list">
      {mastered.slice(0, 12).map((row) => (
        <li key={row.topic.id}>
          ★ {row.topic.name} <small className="muted">{row.topic.subject}</small>
        </li>
      ))}
    </ul>
  );
}

function MapView({
  catalog,
  progress,
  onProgress,
}: {
  catalog: Catalog;
  progress: Progress;
  onProgress: (progress: Progress) => void;
}) {
  const [subject, setSubject] = useState<string>(catalog.subjects[0] ?? "Mathematics");
  const [domain, setDomain] = useState<string>("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);
  const domains = catalog.domainsBySubject.get(subject) ?? [];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.topics
      .filter((topic) => {
        if (subject && topic.subject !== subject) return false;
        if (domain && topic.domain !== domain) return false;
        if (!q) return true;
        return `${topic.name} ${topic.domain} ${topic.subject} ${topic.description}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.ageRangeStart - b.ageRangeStart || a.name.localeCompare(b.name));
  }, [catalog, subject, domain, query]);
  const selected = selectedId ? catalog.byId.get(selectedId) : rows[0];

  return (
    <>
      <div className="legend" aria-label="Skill map legend">
        <span className="status status-mastered">{JOURNEY_LABEL.mastered}</span>
        <span className="status status-practicing">{JOURNEY_LABEL.working}</span>
        <span className="status status-later">{JOURNEY_LABEL.coming}</span>
      </div>
    <section className="map-layout">
      <div>
        <label className="field">
          Search the full curriculum
          <input
            value={query}
            placeholder="Search by name or idea"
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(50);
            }}
          />
        </label>
        <div className="domain-row">
          <button type="button" className={subject === "" ? "chip chip-on" : "chip"} onClick={() => { setSubject(""); setDomain(""); }}>
            All subjects
          </button>
          {catalog.subjects.map((item) => (
            <button
              key={item}
              type="button"
              className={item === subject ? "chip chip-on" : "chip"}
              onClick={() => {
                setSubject(item);
                setDomain("");
                setLimit(50);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="field">
          Domain
          <select value={domain} onChange={(event) => setDomain(event.target.value)}>
            <option value="">All domains</option>
            {domains.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <p className="tiny muted">
          {rows.length} lessons in view · {catalog.topics.length} in the taxonomy
        </p>
        <div className="topic-list">
          {rows.slice(0, limit).map((topic) => {
            const state = journeyState(topic, catalog, progress);
            return (
              <button key={topic.id} type="button" className={selected?.id === topic.id ? "topic-row on" : "topic-row"} onClick={() => setSelectedId(topic.id)}>
                <span>
                  <strong>{topic.name}</strong>
                  <small>
                    {topic.domain} · {ageLabel(topic)} · {themeOf(catalog, topic.id)}
                  </small>
                </span>
                <em className={`status status-${state === "mastered" ? "mastered" : state === "working" ? "practicing" : "later"}`}>{JOURNEY_LABEL[state]}</em>
              </button>
            );
          })}
          {rows.length > limit ? (
            <button type="button" className="ghost" onClick={() => setLimit((value) => value + 50)}>
              Show more
            </button>
          ) : null}
        </div>
      </div>
      {selected ? <TopicDetail topic={selected} catalog={catalog} progress={progress} onProgress={onProgress} onSelect={setSelectedId} /> : null}
    </section>
    </>
  );
}

function TopicDetail({
  topic,
  catalog,
  progress,
  onProgress,
  onSelect,
}: {
  topic: Topic;
  catalog: Catalog;
  progress: Progress;
  onProgress: (progress: Progress) => void;
  onSelect: (id: string) => void;
}) {
  const detail = explainTopic(topic, catalog, progress);
  const dependents = (catalog.dependents.get(topic.id) ?? []).slice(0, 8);
  const state = progress.topics[topic.id];
  return (
    <article className="card detail">
      <p className={`status status-${topicStatus(topic, catalog, progress)}`}>{topicStatus(topic, catalog, progress)}</p>
      <h2>{topic.name}</h2>
      <p className="muted">
        {topic.subject} · {topic.domain} · {ageLabel(topic)} · {topic.type.toLowerCase()}
      </p>
      <p>{topic.description}</p>
      {clusterBlurb(catalog, topic) ? <p className="tiny">{clusterBlurb(catalog, topic)}</p> : null}
      <h3>Evidence of mastery</h3>
      <ul>
        {topic.evidence.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="map-flow">
        <div>
          <h3>Comes after</h3>
          {detail.hard.length === 0 && detail.soft.length === 0 ? <p className="muted">No prerequisites in the taxonomy.</p> : null}
          {detail.hard.map((item) => (
            <button key={item.edge.prerequisiteId} type="button" className="linkish" onClick={() => onSelect(item.edge.prerequisiteId)}>
              <strong>{item.met ? "✓" : "○"} {item.topic?.name ?? item.edge.prerequisiteId}</strong>
              <small>Hard · {item.edge.reason}</small>
            </button>
          ))}
          {detail.soft.map((item) => (
            <button key={`s-${item.edge.prerequisiteId}`} type="button" className="linkish soft" onClick={() => onSelect(item.edge.prerequisiteId)}>
              <strong>{item.met ? "✓" : "○"} {item.topic?.name ?? item.edge.prerequisiteId}</strong>
              <small>Soft · {item.edge.reason}</small>
            </button>
          ))}
        </div>
        <div>
          <h3>Unlocks</h3>
          {dependents.length === 0 ? <p className="muted">Nothing lists this as a prerequisite.</p> : null}
          {dependents.map((edge) => (
            <button key={`${edge.topicId}-${edge.strength}`} type="button" className="linkish" onClick={() => onSelect(edge.topicId)}>
              <strong>
                {edge.strength === "hard" ? "Hard" : "Soft"} · {catalog.byId.get(edge.topicId)?.name ?? edge.topicId}
              </strong>
              <small>{edge.reason}</small>
            </button>
          ))}
        </div>
      </div>
      {detail.blockedReasons.length ? (
        <>
          <h3>Why it is waiting</h3>
          {detail.blockedReasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </>
      ) : (
        <p>{detail.readyBecause.join(" ")}</p>
      )}
      <p className="tiny muted">
        Attempts recorded: {state?.attempts.length ?? 0}
        {state?.mastered ? " · mastered" : ""}
        {hasHandsOn(topic) ? " · hands-on exercises" : " · talk-with-a-grown-up card"}
      </p>
      <div className="row-actions">
        <button type="button" className="secondary" onClick={() => onProgress(mark(progress, topic.id))}>
          Mark mastered
        </button>
        <button type="button" className="ghost" onClick={() => onProgress(clearTopic(progress, topic.id))}>
          Reset topic
        </button>
      </div>
    </article>
  );
}

function mark(progress: Progress, topicId: string): Progress {
  const now = Date.now();
  const prev = progress.topics[topicId] ?? {
    attempts: [],
    mastered: false,
    reviewStage: 0,
    lapses: 0,
    attemptFloor: 0,
  };
  return {
    ...progress,
    topics: {
      ...progress.topics,
      [topicId]: { ...prev, mastered: true, manual: true, masteredAt: now, nextReviewAt: now + 24 * 60 * 60 * 1000 },
    },
  };
}

function clearTopic(progress: Progress, topicId: string): Progress {
  const topics = { ...progress.topics };
  delete topics[topicId];
  return { ...progress, topics };
}

function History({ catalog, progress }: { catalog: Catalog; progress: Progress }) {
  if (!progress.sessions.length) return <p>No sessions yet. A finished lesson will appear here.</p>;
  return (
    <ul className="reason-list">
      {progress.sessions.map((session) => (
        <li key={session.id}>
          <strong>{new Date(session.endedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</strong>
          <p>
            {session.correct}/{session.total} correct · {session.stars} stars · {session.mode === "topic" ? "explored one topic" : "adaptive lesson"}
          </p>
          <p className="tiny muted">
            {session.topicIds
              .map((id) => catalog.byId.get(id)?.name ?? id)
              .slice(0, 6)
              .join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Backup({
  progress,
  onProgress,
  onRename,
}: {
  progress: Progress;
  onProgress: (progress: Progress) => void;
  onRename: (name: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(progress.childName);
  return (
    <section>
      <h2>Backup</h2>
      {syncConfigured() ? (
        <SyncPanel
          progress={progress}
          onJoin={(code, childKey) => {
            onProgress(childKey ? { ...progress, childKey } : progress);
            void code;
          }}
        />
      ) : (
        <p>Progress lives in this browser only. Export a file to keep a copy, or move it to another device.</p>
      )}
      <button
        type="button"
        className="primary"
        onClick={() => {
          const blob = new Blob([exportProgress(progress)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "lumi-progress.json";
          link.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export progress
      </button>
      <label className="field">
        Import a backup
        <input
          type="file"
          accept="application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              onProgress(importProgress(await file.text()));
              setMessage("Backup restored on this device.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Could not read that file.");
            }
          }}
        />
      </label>
      <label className="field">
        Name Lumi uses
        <input value={name} maxLength={16} onChange={(event) => setName(event.target.value)} />
      </label>
      <button type="button" className="secondary" onClick={() => onRename(name.trim() || "friend")}>
        Save name
      </button>
      {confirm ? (
        <div className="card">
          <p>This clears stars, mastery, and session history on this device.</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onProgress({ ...progress, stars: 0, placement: undefined, topics: {}, sessions: [], active: undefined, named: true });
              setConfirm(false);
              setMessage("Progress reset.");
            }}
          >
            Yes, reset everything
          </button>
        </div>
      ) : (
        <button type="button" className="ghost" onClick={() => setConfirm(true)}>
          Reset everything
        </button>
      )}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
