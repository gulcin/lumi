import type { Rng } from "../rng";
import type { Topic } from "../types";
import type { Choice, Exercise, NumericMode, Visual, Worked } from "./types";

export function irand(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function uid(topic: Topic, rng: Rng): string {
  return `${topic.id}_${Math.floor(rng() * 1e9)}`;
}

export function numberExercise(
  topic: Topic,
  rng: Rng,
  generatorId: string,
  fields: {
    prompt: string;
    speak: string;
    explain: string;
    answer: number;
    numeric?: NumericMode;
    visual?: Visual;
    worked?: Worked;
  },
): Exercise {
  return {
    id: uid(topic, rng),
    topicId: topic.id,
    generatorId,
    kind: "number",
    numeric: fields.numeric ?? "int",
    prompt: fields.prompt,
    speak: fields.speak,
    explain: fields.explain,
    answer: fields.answer,
    visual: fields.visual,
    worked: fields.worked,
  };
}

export function choiceExercise(
  topic: Topic,
  rng: Rng,
  generatorId: string,
  fields: {
    prompt: string;
    speak: string;
    explain: string;
    choices: { label: string; emoji?: string; correct?: boolean }[];
    visual?: Visual;
    worked?: Worked;
  },
): Exercise {
  const tagged = fields.choices.map((choice, index) => ({ ...choice, id: `c${index}` }));
  const correct = tagged.find((choice) => choice.correct) ?? tagged[0]!;
  const choices: Choice[] = shuffle(rng, tagged).map((choice) => ({
    id: choice.id,
    label: choice.label,
    emoji: choice.emoji,
  }));
  return {
    id: uid(topic, rng),
    topicId: topic.id,
    generatorId,
    kind: "choice",
    prompt: fields.prompt,
    speak: fields.speak,
    explain: fields.explain,
    choices,
    correctId: correct.id,
    visual: fields.visual,
    worked: fields.worked,
  };
}

export function orderExercise(
  topic: Topic,
  rng: Rng,
  generatorId: string,
  fields: {
    prompt: string;
    speak: string;
    explain: string;
    labels: string[];
  },
): Exercise {
  const items = fields.labels.map((label, index) => ({ id: `w${index}`, label }));
  return {
    id: uid(topic, rng),
    topicId: topic.id,
    generatorId,
    kind: "order",
    prompt: fields.prompt,
    speak: fields.speak,
    explain: fields.explain,
    items: shuffle(rng, items),
    correctOrder: items.map((item) => item.id),
  };
}

export function spokenNumber(n: number): string {
  return String(n);
}
