import { clockHandAngles, clockSpoken } from "./clock";
import type { Exercise, Worked } from "./generators/types";
import { worldPromptFitsTopic } from "./generators/world";
import { exerciseHint } from "./exerciseHint";
import type { Topic } from "./types";

const SHAPE_SIDES: Record<string, number> = {
  triangle: 3,
  square: 4,
  rectangle: 4,
  pentagon: 5,
  hexagon: 6,
};

function close(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

function workedResult(worked: Worked): number | null {
  if (worked.op === "+") return worked.a + worked.b;
  if (worked.op === "-") return worked.a - worked.b;
  if (worked.op === "*") return worked.a * worked.b;
  if (worked.op === "/") return worked.b === 0 ? null : worked.a / worked.b;
  if (worked.op === "pct") return (worked.a / 100) * worked.b;
  if (worked.op === "eq") return worked.b - worked.a;
  return null;
}

export function checkExercise(topic: Topic, exercise: Exercise): string[] {
  const issues: string[] = [];
  const bad = (message: string) => issues.push(message);
  const blob = `${exercise.prompt} ${exercise.speak} ${exercise.explain}`;
  if (!exercise.prompt.trim()) bad("empty prompt");
  if (!exercise.speak.trim()) bad("empty spoken line");
  if (!exercise.explain.trim()) bad("empty feedback");
  if (/\b(undefined|NaN|Infinity)\b/.test(blob)) bad("broken text");
  if (exercise.prompt.length > 480) bad("prompt is too long to read");
  const hint = exerciseHint(exercise);
  if (!hint.trim() || hint.length > 160) bad("hint is missing");
  if (exercise.kind === "number" && exercise.answer != null && exercise.answer !== 0) {
    const token = String(exercise.answer);
    if (hint.includes(token)) bad("hint gives away the answer");
  }
  if (exercise.kind === "choice") {
    const correctLabel = exercise.choices?.find((choice) => choice.id === exercise.correctId)?.label.trim() ?? "";
    if (correctLabel.length >= 3) {
      const escaped = correctLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(hint)) bad("hint gives away the choice");
    }
  }

  if (exercise.kind === "choice") {
    const choices = exercise.choices ?? [];
    if (choices.length < 2 || choices.length > 4) bad(`${choices.length} choices`);
    const labels = choices.map((choice) => choice.label.trim().toLowerCase());
    if (labels.some((label) => !label)) bad("blank choice");
    if (new Set(labels).size !== labels.length) bad("duplicate choices");
    if (!choices.some((choice) => choice.id === exercise.correctId)) bad("correct choice is missing");
  }

  if (exercise.kind === "number") {
    const answer = exercise.answer;
    if (answer == null || !Number.isFinite(answer)) bad("answer is not a number");
    else {
      const mode = exercise.numeric ?? "int";
      const digits = String(Math.abs(answer)).replace(".", "");
      if (digits.length > 6) bad("answer does not fit the keypad");
      if (mode !== "decimal" && !Number.isInteger(answer)) bad("decimal answer on a whole-number keypad");
      if (mode !== "negative" && answer < 0) bad("negative answer without the sign key");
    }
  }

  if (exercise.kind === "order") {
    const items = exercise.items ?? [];
    const order = exercise.correctOrder ?? [];
    if (items.length < 2 || items.length > 8) bad(`${items.length} parts to order`);
    const labels = items.map((item) => item.label.trim().toLowerCase());
    if (labels.some((label) => !label)) bad("blank order part");
    if (new Set(labels).size !== labels.length) bad("duplicate order parts");
    if ([...order].sort().join() !== items.map((item) => item.id).sort().join()) bad("order is not a full arrangement");
  }

  if (exercise.kind === "talk") {
    const points = exercise.talkPoints ?? [];
    if (!points.length || points.some((point) => !point.trim())) bad("nothing to talk about");
    if (points.some((point) => point.length > 140 || /[(&]|research|hypothesis/i.test(point))) {
      bad("talk point is not written for a child");
    }
  }

  if (exercise.worked && exercise.kind === "number" && exercise.answer != null) {
    const expected = workedResult(exercise.worked);
    if (expected == null || !close(expected, exercise.worked.answer)) bad("worked steps disagree");
    const worked = exercise.worked;
    const direct = close(exercise.answer, worked.answer);
    const missingAddend = worked.op === "+" && close(worked.a + exercise.answer, worked.answer);
    if (!direct && !missingAddend) bad("answer does not match the working");
  }

  const visual = exercise.visual;
  if (visual?.type === "count" && exercise.kind === "number" && exercise.answer != null) {
    if (visual.count < 1 || visual.count > 30) bad("count picture is an odd size");
    if ((exercise.prompt === "How many?" || /rows of/.test(exercise.prompt)) && visual.count !== exercise.answer) {
      bad("picture does not match the question");
    }
  }
  if (visual?.type === "groups" && exercise.kind === "choice") {
    const ranked = [...visual.groups].sort((a, b) => b.count - a.count);
    if (ranked.length >= 2 && ranked[0]!.count === ranked[1]!.count) bad("the groups are a tie");
    const correct = exercise.choices?.find((choice) => choice.id === exercise.correctId)?.label.toLowerCase() ?? "";
    const winner = ranked[0]?.label?.toLowerCase() ?? "";
    if (winner && !correct.includes(winner)) bad("the larger group is not the accepted answer");
  }
  if (visual?.type === "clock") {
    if (visual.hour < 1 || visual.hour > 12 || ![0, 15, 30, 45].includes(visual.minute)) bad("clock does not match a time we ask");
    const angles = clockHandAngles(visual.hour, visual.minute);
    if (angles.minute !== visual.minute * 6 || angles.hour !== (visual.hour % 12) * 30 + visual.minute * 0.5) {
      bad("clock hand angles are wrong");
    }
    if (visual.minute === 0 && exercise.kind === "number" && exercise.answer !== visual.hour) bad("o'clock answer does not match the clock");
  }
  if (visual?.type === "fraction") {
    if (visual.parts < 1 || visual.filled < 0 || visual.filled > visual.parts) bad("fraction picture is impossible");
  }
  if (visual?.type === "coins" && exercise.answer != null) {
    const sum = visual.values.reduce((total, value) => total + value, 0);
    if (!close(sum, exercise.answer)) bad("coins do not match the answer");
  }
  if (visual?.type === "bars" && exercise.kind === "choice") {
    const top = Math.max(...visual.bars.map((bar) => bar.value));
    if (visual.bars.filter((bar) => bar.value === top).length !== 1) bad("two bars are equally tall");
  }
  if (visual?.type === "shape" && exercise.kind === "choice") {
    const correct = exercise.choices?.find((choice) => choice.id === exercise.correctId)?.label.toLowerCase() ?? "";
    if (correct && correct !== visual.name.toLowerCase()) bad("shape picture does not match the answer");
  }
  if (visual?.type === "shape" && exercise.kind === "number" && /sides/.test(exercise.prompt) && exercise.answer != null) {
    const sides = SHAPE_SIDES[visual.name];
    if (sides == null || exercise.answer !== sides) bad("the side count does not match the shape");
  }

  const expected = independentLabels(exercise);
  if (expected && exercise.kind === "choice") {
    const fitting = exercise.choices?.filter((choice) => expected.includes(choice.label.trim().toLowerCase())) ?? [];
    const marked = exercise.choices?.filter((choice) => choice.id === exercise.correctId) ?? [];
    if (fitting.length !== 1 || marked.length !== 1 || fitting[0]?.id !== marked[0]?.id) {
      bad(`expected ${expected.join(" or ")} but the choices disagree`);
    }
  }

  const skill = topic.name.toLowerCase();
  if (/compar/.test(skill) && /duration/.test(skill) && !/longer|shorter/.test(exercise.prompt.toLowerCase())) {
    bad("this duration skill does not compare durations");
  }
  if (/^telling time/i.test(topic.name) && exercise.visual?.type !== "clock") {
    bad("telling the time does not show a clock");
  }
  if (/^read each one/i.test(hint)) bad("hint is too vague");
  if (exercise.visual?.type === "clock" && !/hand/i.test(hint)) bad("clock hint does not mention the hands");

  if (exercise.generatorId === "world" && topic.ageRangeStart >= 8 && !worldPromptFitsTopic(topic, exercise.prompt)) {
    bad(`question does not match this skill (${exercise.prompt})`);
  }

  return issues;
}

function independentLabels(exercise: Exercise): string[] | null {
  const prompt = exercise.prompt.trim();
  const blend = /^Which word is ((?:[a-z]{1,3})(?: [a-z]{1,3})+)\??$/i.exec(prompt);
  if (blend) return [blend[1]!.replace(/ /g, "").toLowerCase()];
  if (/same as 3 o'clock in the afternoon/i.test(prompt)) return ["15:00"];
  const longer = /^Which lasts longer, (\d+) minutes or (\d+) minutes\?$/.exec(prompt);
  if (longer) return [`${Math.max(Number(longer[1]), Number(longer[2]))} minutes`];
  const same = /^Which fraction equals (\d+)\s*\/\s*(\d+)\?$/.exec(prompt);
  if (same && exercise.choices) {
    const target = Number(same[1]) / Number(same[2]);
    return exercise.choices
      .filter((choice) => {
        const parts = /^(\d+)\s*\/\s*(\d+)$/.exec(choice.label.trim());
        return parts != null && Number(parts[2]) !== 0 && Number(parts[1]) / Number(parts[2]) === target;
      })
      .map((choice) => choice.label.trim().toLowerCase());
  }
  if (exercise.visual?.type === "fraction" && /fraction is shaded/i.test(prompt)) {
    return [`${exercise.visual.filled}/${exercise.visual.parts}`];
  }
  if (exercise.visual?.type === "shape" && exercise.kind === "choice") return [exercise.visual.name.toLowerCase()];
  if (exercise.visual?.type === "clock" && exercise.kind === "choice") return [clockSpoken(exercise.visual.hour, exercise.visual.minute).toLowerCase()];
  if (exercise.visual?.type === "bars" && exercise.kind === "choice") {
    const max = Math.max(...exercise.visual.bars.map((bar) => bar.value));
    return exercise.visual.bars.filter((bar) => bar.value === max).map((bar) => bar.label.toLowerCase());
  }
  return null;
}
