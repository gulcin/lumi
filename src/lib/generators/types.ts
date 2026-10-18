export type Choice = { id: string; label: string; emoji?: string };

export type Visual =
  | { type: "count"; emoji: string; count: number }
  | { type: "groups"; groups: { emoji: string; count: number; label?: string }[] }
  | { type: "clock"; hour: number; minute: number }
  | { type: "shape"; name: string }
  | { type: "fraction"; parts: number; filled: number }
  | { type: "coins"; values: number[] }
  | { type: "place"; hundreds: number; tens: number; ones: number }
  | { type: "bars"; bars: { label: string; value: number }[] }
  | { type: "equation"; text: string };

export type NumericMode = "int" | "decimal" | "negative";

export type Worked = {
  op: "+" | "-" | "*" | "/" | "pct" | "eq";
  a: number;
  b: number;
  answer: number;
};

export type Exercise = {
  id: string;
  topicId: string;
  generatorId: string;
  kind: "choice" | "number" | "order" | "talk";
  prompt: string;
  speak: string;
  explain: string;
  choices?: Choice[];
  correctId?: string;
  answer?: number;
  numeric?: NumericMode;
  items?: Choice[];
  correctOrder?: string[];
  talkPoints?: string[];
  visual?: Visual;
  worked?: Worked;
};

export function exerciseSpeak(exercise: Exercise): string {
  if (exercise.kind === "choice" && exercise.choices?.length) {
    const labels = exercise.choices.map((choice) => choice.label.replace(/^[A-D]\.\s*/, ""));
    return `${exercise.speak} ${labels.join(". ")}.`;
  }
  if (exercise.kind === "order") {
    return `${exercise.speak} Tap the parts in order.`;
  }
  return exercise.speak;
}
