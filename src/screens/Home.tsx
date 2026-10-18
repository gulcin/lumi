import { useEffect, useState } from "react";
import { FooterNote, Shell, Stars, TopBar } from "../components/Chrome";
import { Lumi } from "../components/Lumi";
import { levelCopy } from "../lib/adaptive";
import { speak } from "../lib/speech";
import { ATTRIBUTION, type Progress } from "../lib/types";

export function NameScreen({
  speechOn,
  onSave,
}: {
  speechOn: boolean;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const line = "Hi. I am Lumi. What should I call you?";
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn]);
  return (
    <Shell>
      <TopBar title="Lumi" speechOn={speechOn} onReplay={() => speak(line)} />
      <Lumi mood="happy" />
      <h1>What should I call you?</h1>
      <label className="field">
        <span className="sr">Your name</span>
        <input
          value={name}
          maxLength={16}
          autoComplete="nickname"
          placeholder="Your name"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button type="button" className="primary" onClick={() => onSave(name.trim() || "friend")}>
        That's me
      </button>
      <button type="button" className="ghost" data-testid="name-skip" onClick={() => onSave("friend")}>
        Call me friend
      </button>
    </Shell>
  );
}

export function HomeScreen({
  progress,
  speechOn,
  onToggleSpeech,
  onPlay,
  onExplore,
  onGrownups,
}: {
  progress: Progress;
  speechOn: boolean;
  onToggleSpeech: () => void;
  onPlay: () => void;
  onExplore: () => void;
  onGrownups: () => void;
}) {
  const name = progress.childName || "friend";
  const continuing = Boolean(progress.active);
  const line = progress.placement
    ? `Hi ${name}. I am Lumi. Ready for a lesson of about ten minutes?`
    : `Hi ${name}. Let's play a few quick ones so I can find your starting point.`;
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn, line]);
  const mastered = Object.values(progress.topics).filter((topic) => topic.mastered).length;
  return (
    <Shell>
      <TopBar title="Lumi" speechOn={speechOn} onToggleSpeech={onToggleSpeech} onReplay={() => speak(line)} />
      <Lumi mood="idle" />
      <h1>Hi, {name}.</h1>
      <p className="lede">Little lessons that grow with you, from first steps all the way up.</p>
      <Stars count={progress.stars} />
      <p className="muted">{mastered === 0 ? "Your first star skill is waiting." : `${mastered} star ${mastered === 1 ? "skill" : "skills"}.`}</p>
      {progress.placement ? <p className="pill">{levelCopy(progress.placement.level)}</p> : null}
      <button type="button" className="primary" data-testid="home-play" onClick={onPlay}>
        {continuing ? "Continue the lesson" : progress.placement ? "Start a lesson" : "Find my level"}
      </button>
      <button type="button" className="secondary" data-testid="home-explore" onClick={onExplore}>
        Explore the map
      </button>
      <button type="button" className="text-btn" data-testid="home-grownups" onClick={onGrownups}>
        Grown-ups
      </button>
      <FooterNote text={ATTRIBUTION} />
    </Shell>
  );
}

export function ReadyScreen({
  progress,
  speechOn,
  onStart,
  onHome,
}: {
  progress: Progress;
  speechOn: boolean;
  onStart: () => void;
  onHome: () => void;
}) {
  const level = progress.placement?.level ?? "growing";
  const line =
    level === "emerging"
      ? "We'll start with gentle steps. When those feel easy, the lessons climb as far as you want."
      : level === "growing"
        ? "You already know a lot. We'll build from there, and keep going upward."
        : "You are ready for bigger steps. There is no top. We can go as far as you like.";
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn, line]);
  return (
    <Shell>
      <TopBar title="Ready" onBack={onHome} onReplay={() => speak(line)} speechOn={speechOn} />
      <Lumi mood="cheer" />
      <h1>I know where to start.</h1>
      <p className="lede">{line}</p>
      <button type="button" className="primary" data-testid="placement-done" onClick={onStart}>
        Start my first lesson
      </button>
    </Shell>
  );
}
