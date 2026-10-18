import { useEffect, useRef, useState } from "react";
import { buildCatalog } from "./lib/catalog";
import { hasHandsOn } from "./lib/generators";
import { planSession, planTopicPractice } from "./lib/adaptive";
import { isFamilyCode, normalizeFamilyCode } from "./lib/familyCode";
import { placementFromScore } from "./lib/placement";
import { newSessionId, loadProgress, saveProgress } from "./lib/progress";
import { randomRng } from "./lib/rng";
import { loadSyncMeta, pushProgress, saveSyncMeta, syncConfigured } from "./lib/syncClient";
import { mergeProgress } from "./lib/syncMerge";
import type { Catalog, Progress, PypThemeId, Topic } from "./lib/types";
import { CelebrationScreen } from "./screens/Celebration";
import { ChatScreen } from "./screens/Chat";
import { ExploreScreen, TopicPeek } from "./screens/Explore";
import { GateScreen } from "./screens/Gate";
import { GrownupPlacementScreen } from "./screens/GrownupPlacement";
import { HomeScreen, NameScreen, ReadyScreen } from "./screens/Home";
import { InterestsScreen } from "./screens/Interests";
import { JournalScreen } from "./screens/Journal";
import { ParentScreen } from "./screens/Parent";
import { PlacementScreen } from "./screens/Placement";
import { SessionScreen } from "./screens/Session";
import { ShopScreen } from "./screens/Shop";
import { ThemePathScreen } from "./screens/ThemePath";

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
  | "parent"
  | "theme"
  | "interests"
  | "shop"
  | "journal"
  | "chat"
  | "gplace";

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>("loading");
  const [peek, setPeek] = useState<Topic | null>(null);
  const [peekBack, setPeekBack] = useState<"explore" | "theme">("explore");
  const [themeId, setThemeId] = useState<PypThemeId>("where-we-are");
  const [journalTopic, setJournalTopic] = useState<{ id?: string; name?: string }>({});
  const [journalGrownup, setJournalGrownup] = useState(false);
  const [afterGate, setAfterGate] = useState<"parent" | "gplace">("parent");
  const kickSync = useRef<() => void>(() => {});
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

  useEffect(() => {
    if (!syncConfigured()) return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fromHash = hash.get("sync");
    if (fromHash && isFamilyCode(fromHash)) {
      saveSyncMeta({ ...loadSyncMeta(), familyCode: normalizeFamilyCode(fromHash), dirty: true });
      const clean = `${window.location.pathname}${window.location.search}`;
      history.replaceState(null, "", clean);
    }
    let timer = 0;
    let stopped = false;
    async function flush() {
      const meta = loadSyncMeta();
      if (!meta.familyCode || stopped) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        saveSyncMeta({ ...meta, dirty: true, lastError: "Offline. This device will sync when it reconnects." });
        return;
      }
      const local = loadProgress();
      try {
        const merged = await pushProgress(local, meta.familyCode);
        const latest = loadProgress();
        const finalDoc = latest.deviceUpdatedAt > local.deviceUpdatedAt ? mergeProgress(merged, latest) : merged;
        saveProgress(finalDoc);
        if (!stopped) setProgress(finalDoc);
        saveSyncMeta({
          ...loadSyncMeta(),
          familyCode: meta.familyCode,
          dirty: false,
          lastError: undefined,
          lastSyncedAt: Date.now(),
          status: "Synced.",
        });
      } catch (reason) {
        saveSyncMeta({
          ...loadSyncMeta(),
          familyCode: meta.familyCode,
          dirty: true,
          lastError: reason instanceof Error ? reason.message : "Sync paused.",
        });
      }
    }
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void flush(), 400);
    }
    function onShow() {
      if (document.visibilityState === "visible") void flush();
    }
    function onOnline() {
      void flush();
    }
    kickSync.current = schedule;
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onShow);
    void flush();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);

  function commit(next: Progress, source: "local" | "sync" = "local") {
    const stamped = source === "sync" ? next : { ...next, deviceUpdatedAt: Date.now() };
    saveProgress(stamped);
    setProgress(stamped);
    if (source === "local" && syncConfigured() && loadSyncMeta().familyCode) {
      saveSyncMeta({ ...loadSyncMeta(), dirty: true });
      kickSync.current();
    }
  }

  function toggleSpeech() {
    commit({ ...progress, speechOn: !progress.speechOn });
  }

  function startPath(base: Progress = progress, theme?: string) {
    if (!catalog) return;
    const rng = randomRng();
    const items = planSession(catalog, base, Date.now(), rng, hasHandsOn, theme);
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
    setJournalTopic({ id: topic.id, name: topic.name });
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
          else if (!progress.placement) {
            setAfterGate("gplace");
            setScreen("gate");
          } else startPath();
        }}
        onWarmup={() => setScreen("placement")}
        onExplore={() => setScreen("explore")}
        onGrownups={() => {
          setAfterGate("parent");
          setScreen("gate");
        }}
        onTheme={(id) => {
          setThemeId(id);
          setScreen("theme");
        }}
        onInterests={() => setScreen("interests")}
        onShop={() => setScreen("shop")}
        onJournal={() => {
          setJournalGrownup(false);
          setScreen("journal");
        }}
        onChat={() => setScreen("chat")}
      />
    );
  }
  if (screen === "theme") {
    return (
      <ThemePathScreen
        themeId={themeId}
        catalog={catalog}
        progress={progress}
        speechOn={progress.speechOn}
        onBack={() => setScreen("home")}
        onOpen={(topic) => {
          setPeek(topic);
          setPeekBack("theme");
          setScreen("peek");
        }}
        onPlay={() => startPath(progress, themeId)}
      />
    );
  }
  if (screen === "interests") {
    return (
      <InterestsScreen
        progress={progress}
        speechOn={progress.speechOn}
        onBack={() => setScreen("home")}
        onToggle={(id) => {
          const interests = progress.interests.includes(id)
            ? progress.interests.filter((item) => item !== id)
            : [...progress.interests, id].slice(0, 12);
          commit({ ...progress, interests });
        }}
      />
    );
  }
  if (screen === "shop") {
    return <ShopScreen progress={progress} speechOn={progress.speechOn} onBack={() => setScreen("home")} onProgress={commit} />;
  }
  if (screen === "journal") {
    return (
      <JournalScreen
        speechOn={progress.speechOn}
        grownup={journalGrownup}
        topicId={journalTopic.id}
        topicName={journalTopic.name}
        onBack={() => setScreen(journalGrownup ? "parent" : "home")}
      />
    );
  }
  if (screen === "chat") {
    const hintId = progress.active?.items[progress.active.index]?.topicId ?? progress.sessions[0]?.topicIds[0];
    const topicHint = hintId ? catalog.byId.get(hintId)?.name : undefined;
    return <ChatScreen progress={progress} speechOn={progress.speechOn} topicHint={topicHint} onBack={() => setScreen("home")} />;
  }
  if (screen === "gplace") {
    return (
      <GrownupPlacementScreen
        catalog={catalog}
        progress={progress}
        onCancel={() => setScreen("parent")}
        onDone={(next) => {
          commit(next);
          setScreen("ready");
        }}
      />
    );
  }
  if (screen === "placement") {
    return (
      <PlacementScreen
        e2e={e2e}
        speechOn={progress.speechOn}
        soundOn={progress.soundOn}
        startGrade={progress.startGrade}
        onCancel={() => setScreen("home")}
        onFinish={(correct, total) => {
          const placement = placementFromScore(correct, total, Date.now(), progress.startGrade);
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
        onJournal={() => {
          const last = progress.sessions[0]?.topicIds[0];
          const topic = last ? catalog.byId.get(last) : undefined;
          setJournalTopic({ id: topic?.id ?? journalTopic.id ?? "session", name: topic?.name ?? "Today's lesson" });
          setJournalGrownup(false);
          setScreen("journal");
        }}
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
          setPeekBack("explore");
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
        onBack={() => setScreen(peekBack)}
        onStart={() => startTopic(peek)}
      />
    );
  }
  if (screen === "gate") {
    return (
      <GateScreen
        speechOn={progress.speechOn}
        onCancel={() => setScreen("home")}
        onOpen={() => setScreen(afterGate)}
      />
    );
  }
  return (
    <ParentScreen
      catalog={catalog}
      progress={progress}
      onBack={() => setScreen("home")}
      onProgress={commit}
      onRename={(name) => commit({ ...progress, childName: name, named: true })}
      onPlacement={() => setScreen("gplace")}
      onJournal={() => {
        setJournalGrownup(true);
        setScreen("journal");
      }}
    />
  );
}
