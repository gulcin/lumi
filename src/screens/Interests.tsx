import { useEffect } from "react";
import { PaintCard } from "../components/Art";
import { Shell, TopBar } from "../components/Chrome";
import { INTEREST_ART } from "../lib/art";
import { INTERESTS } from "../lib/interests";
import { speak } from "../lib/speech";
import type { Progress } from "../lib/types";

export function InterestsScreen({
  progress,
  speechOn,
  onBack,
  onToggle,
}: {
  progress: Progress;
  speechOn: boolean;
  onBack: () => void;
  onToggle: (id: string) => void;
}) {
  const line = "What do you love? Pick a few. Lessons you are ready for will lean that way.";
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn]);
  return (
    <Shell>
      <TopBar title="I love" onBack={onBack} speechOn={speechOn} onReplay={() => speak(line)} />
      <h1>What do you love?</h1>
      <p className="lede">{line}</p>
      <div className="theme-grid" data-testid="interests">
        {INTERESTS.map((interest) => {
          const on = progress.interests.includes(interest.id);
          return (
            <PaintCard
              key={interest.id}
              art={INTEREST_ART[interest.id] ?? "spots/acorn"}
              title={interest.label}
              detail={on ? "Chosen" : "Tap to choose"}
              on={on}
              onClick={() => {
                if (speechOn) speak(interest.speak);
                onToggle(interest.id);
              }}
            />
          );
        })}
      </div>
    </Shell>
  );
}
