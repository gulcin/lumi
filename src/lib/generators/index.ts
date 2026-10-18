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

function childPoint(line: string): string | null {
  if (line.includes("(") || line.includes("&") || /research|hypothesis|theoretical|framework/i.test(line)) return null;
  const text = line.replace(/\s+/g, " ").trim();
  if (text.length < 8 || text.length > 120) return null;
  const friendly = text.replace(/\btheir\b/gi, "your").replace(/\bthey\b/gi, "you");
  const sentence = friendly.charAt(0).toUpperCase() + friendly.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function talkPointsFor(topic: Topic): string[] {
  const source = topic.evidence.length ? topic.evidence : [topic.assessmentPrompt];
  const points = source.map(childPoint).filter((line): line is string => line != null).slice(0, 3);
  if (points.length) return points;
  return ["What does this mean, in your own words?", "Where might you notice it?", "Tell a grown-up one example."];
}

export function talkCard(topic: Topic): Exercise {
  const points = talkPointsFor(topic);
  return {
    id: `talk_${topic.id}`,
    topicId: topic.id,
    generatorId: "talk",
    kind: "talk",
    prompt: `Let's talk about ${topic.name}.`,
    speak: `Let's talk about ${topic.name}. ${points[0]} Show a grown-up.`,
    explain: "Lovely talking. That counts as a try.",
    talkPoints: points,
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
