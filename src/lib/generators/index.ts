import type { Topic } from "../types";
import type { Rng } from "../rng";
import { mulberry32 } from "../rng";
import type { Exercise } from "./types";
import { tryLiteracy } from "./literacy";
import { tryMath } from "./math";
import { tryStoneAge } from "./stoneAge";
import { tryWorld } from "./world";

export type { Exercise } from "./types";
export { exerciseSpeak } from "./types";

function childSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return trimmed.length > 220 ? `${trimmed.slice(0, 217)}…` : trimmed;
}

export function talkCard(topic: Topic): Exercise {
  const points = (topic.evidence.length ? topic.evidence : [topic.assessmentPrompt]).slice(0, 3);
  const description = childSentence(topic.description);
  return {
    id: `talk_${topic.id}`,
    topicId: topic.id,
    generatorId: "talk",
    kind: "talk",
    prompt: `Let's talk about ${topic.name}.`,
    speak: `Let's talk about ${topic.name}. ${description}. Show a grown-up, and talk about one of the ideas.`,
    explain: "Lovely talking. That counts as a try.",
    talkPoints: points.map(childSentence),
    visual: { type: "equation", text: topic.domain },
  };
}

export function createExercise(topic: Topic, rng: Rng): Exercise {
  return tryMath(topic, rng) ?? tryLiteracy(topic, rng) ?? tryStoneAge(topic, rng) ?? tryWorld(topic, rng) ?? talkCard(topic);
}

export function exerciseFromSeed(topic: Topic, seed: number): Exercise {
  return createExercise(topic, mulberry32(seed));
}

const handsOnCache = new Map<string, boolean>();

export function hasHandsOn(topic: Topic): boolean {
  const cached = handsOnCache.get(topic.id);
  if (cached != null) return cached;
  const probe = createExercise(topic, mulberry32(topic.id.length * 997 + topic.ageRangeStart * 13));
  const handsOn = probe.generatorId !== "talk";
  handsOnCache.set(topic.id, handsOn);
  return handsOn;
}

export function answersMatch(exercise: Exercise, response: string): boolean {
  if (exercise.kind === "choice") return response === exercise.correctId;
  if (exercise.kind === "talk") return response === "talked";
  if (exercise.kind === "order") return response === (exercise.correctOrder ?? []).join("|");
  if (exercise.kind === "number") {
    const value = Number(response);
    if (!Number.isFinite(value) || exercise.answer == null) return false;
    return Math.abs(value - exercise.answer) < 0.001;
  }
  return false;
}
