import { useEffect, useState } from "react";
import { buildCatalog } from "./lib/catalog";
import { hasHandsOn } from "./lib/generators";
import { placementFromScore, planSession, planTopicPractice } from "./lib/adaptive";
import { newSessionId, loadProgress, saveProgress } from "./lib/progress";
import { randomRng } from "./lib/rng";
import type { Catalog, Progress, Topic } from "./lib/types";
import { CelebrationScreen } from "./screens/Celebration";
import { ExploreScreen, TopicPeek } from "./screens/Explore";
import { GateScreen } from "./screens/Gate";
import { HomeScreen, NameScreen, ReadyScreen } from "./screens/Home";
import { ParentScreen } from "./screens/Parent";
import { PlacementScreen } from "./screens/Placement";
import { SessionScreen } from "./screens/Session";

type Screen =
  | "loading"
  | "error"
  | "name"
  | "home"
  | "placement"
  | "ready"
  | "session"
  | "celebrate"
  | "explore"
  | "peek"
  | "gate"
  | "parent";

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>("loading");
  const [peek, setPeek] = useState<Topic | null>(null);
  const e2e = new URLSearchParams(window.location.search).has("e2e");

  useEffect(() => {
    let cancel = false;
    const url = `${import.meta.env.BASE_URL}data/taxonomy.json`;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Lesson book failed to load (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (cancel) return;
        setCatalog(buildCatalog(data));
        setScreen(loadProgress().named ? "home" : "name");
      })
      .catch((reason: unknown) => {
        if (cancel) return;
        setError(reason instanceof Error ? reason.message : "Lesson book failed to load.");
        setScreen("error");
      });
    return () => {
      cancel = true;
    };
  }, []);

  function commit(next: Progress) {
    saveProgress(next);
    setProgress(next);
  }

  function toggleSpeech() {
    commit({ ...progress, speechOn: !progress.speechOn });
  }

  function startPath(base: Progress = progress) {
    if (!catalog) return;
    const rng = randomRng();
    const items = planSession(catalog, base, Date.now(), rng, hasHandsOn);
    if (!items.length) {
      commit({ ...base, active: undefined });
      setScreen("celebrate");
      return;
    }
    commit({
      ...base,
      active: {
        id: newSessionId(Date.now(), rng),
        mode: "path",
        startedAt: Date.now(),
        items,
        index: 0,
        correct: 0,
        stars: 0,
        newlyMastered: [],
      },
    });
    setScreen("session");
  }

  function startTopic(topic: Topic) {
    if (!catalog) return;
    const rng = randomRng();
    commit({
      ...progress,
      active: {
        id: newSessionId(Date.now(), rng),
        mode: "topic",
        topicId: topic.id,
        startedAt: Date.now(),
        items: planTopicPractice(topic, rng, hasHandsOn),
        index: 0,
        correct: 0,
        stars: 0,
        newlyMastered: [],
      },
    });
    setScreen("session");
  }

  if (screen === "loading") {
    return (
      <main className="shell">
        <h1>Getting the lesson book…</h1>
      </main>
    );
  }
  if (screen === "error" || !catalog) {
    return (
      <main className="shell">
        <h1>Lumi can't find the lesson book.</h1>
        <p>{error || "Try refreshing this page."}</p>
      </main>
    );
  }

  if (screen === "name") {
    return (
      <NameScreen
        speechOn={progress.speechOn}
        onSave={(name) => {
          commit({ ...progress, childName: name, named: true });
          setScreen("home");
        }}
      />
    );
  }
  if (screen === "home") {
    return (
      <HomeScreen
        progress={progress}
        speechOn={progress.speechOn}
        onToggleSpeech={toggleSpeech}
        onPlay={() => {
          if (progress.active) setScreen("session");
          else if (!progress.placement) setScreen("placement");
          else startPath();
        }}
        onExplore={() => setScreen("explore")}
        onGrownups={() => setScreen("gate")}
      />
    );
  }
  if (screen === "placement") {
    return (
      <PlacementScreen
        e2e={e2e}
        speechOn={progress.speechOn}
        soundOn={progress.soundOn}
        onCancel={() => setScreen("home")}
        onFinish={(correct, total) => {
          const placement = placementFromScore(correct, total, Date.now());
          commit({
            ...progress,
            placement,
            stars: progress.stars + correct,
          });
          setScreen("ready");
        }}
      />
    );
  }
  if (screen === "ready") {
    return (
      <ReadyScreen
        progress={progress}
        speechOn={progress.speechOn}
        onHome={() => setScreen("home")}
        onStart={() => startPath()}
      />
    );
  }
  if (screen === "session") {
    return (
      <SessionScreen
        catalog={catalog}
        progress={progress}
        e2e={e2e}
        speechOn={progress.speechOn}
        soundOn={progress.soundOn}
        onToggleSpeech={toggleSpeech}
        onProgress={commit}
        onExit={() => setScreen("home")}
        onDone={() => setScreen("celebrate")}
      />
    );
  }
  if (screen === "celebrate") {
    return (
      <CelebrationScreen
        catalog={catalog}
        progress={progress}
        speechOn={progress.speechOn}
        onHome={() => setScreen("home")}
        onExplore={() => setScreen("explore")}
        onAgain={() => startPath()}
      />
    );
  }
  if (screen === "explore") {
    return (
      <ExploreScreen
        catalog={catalog}
        progress={progress}
        speechOn={progress.speechOn}
        onBack={() => setScreen("home")}
        onOpen={(topic) => {
          setPeek(topic);
          setScreen("peek");
        }}
      />
    );
  }
  if (screen === "peek" && peek) {
    return (
      <TopicPeek
        topic={peek}
        catalog={catalog}
        progress={progress}
        speechOn={progress.speechOn}
        onBack={() => setScreen("explore")}
        onStart={() => startTopic(peek)}
      />
    );
  }
  if (screen === "gate") {
    return <GateScreen speechOn={progress.speechOn} onCancel={() => setScreen("home")} onOpen={() => setScreen("parent")} />;
  }
  return (
    <ParentScreen
      catalog={catalog}
      progress={progress}
      onBack={() => setScreen("home")}
      onProgress={commit}
      onRename={(name) => commit({ ...progress, childName: name, named: true })}
    />
  );
}
