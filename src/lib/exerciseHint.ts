import type { Exercise } from "./generators/types";

/** A clue that never states the answer. */
export function exerciseHint(exercise: Exercise): string {
  if (exercise.kind === "talk") return "Pick one idea and tell a grown-up what it means.";
  if (exercise.kind === "order") return "Start with the part that should come first.";
  if (exercise.kind === "choice") return "Read each one. Only one of them fits.";
  if (exercise.visual?.type === "count") return "Count each mark once.";
  if (exercise.visual?.type === "clock") return "The short hand is the hour. The long hand shows the minutes.";
  if (exercise.visual?.type === "coins") return "Add the coins. They are in koruna.";
  if (exercise.visual?.type === "fraction") return "Count the shaded parts, then count all the parts.";
  const op = exercise.worked?.op;
  if (op === "+") return "Add the two amounts.";
  if (op === "-") return "Start with the first amount and take the second away.";
  if (op === "*") return "This is equal groups. Multiply.";
  if (op === "/") return "Share into equal groups.";
  if (op === "pct") return "Percent means out of one hundred.";
  if (op === "eq") return "Find the missing amount that makes both sides match.";
  if (exercise.numeric === "decimal") return "Use the dot key if you need a decimal point.";
  if (exercise.numeric === "negative") return "Tap plus-minus if the answer is below zero.";
  return "Look once more, then try a different answer.";
}
