import type { Exercise } from "./generators/types";

/** A clue that never states the answer. */
export function exerciseHint(exercise: Exercise): string {
  const prompt = exercise.prompt.toLowerCase();
  const visual = exercise.visual;

  if (visual?.type === "clock") {
    if (visual.minute === 0) return "The short red hand points to the hour.";
    return "The long teal hand shows the minutes. The short red hand moves as the minutes pass.";
  }
  if (visual?.type === "count") return "Count each mark once.";
  if (visual?.type === "groups") return "Count the marks in each group, then see which has more.";
  if (visual?.type === "coins") return "Add the coins. They are in koruna.";
  if (visual?.type === "fraction") {
    if (prompt.includes("shaded")) return "Count the shaded parts, then count all the parts.";
    return "The picture shows the fraction. Use it on the whole amount.";
  }
  if (visual?.type === "bars") return "Find the bar that reaches highest.";
  if (visual?.type === "shape") {
    if (prompt.includes("side")) return "Count the straight sides.";
    return "Look at the sides and the corners.";
  }
  if (visual?.type === "place") return "A rod is a ten. A small block is a one.";

  if (exercise.kind === "talk") return "Pick one idea and tell a grown-up what it means.";
  if (exercise.kind === "order") return "Start with the one that comes first.";

  if (/lasts longer|minutes or/.test(prompt)) return "Compare the two amounts of time.";
  if (prompt.includes("ratio")) return "Add the parts, then share the total into those parts.";
  if (prompt.includes("odd or even")) return "Try splitting it into pairs.";
  if (prompt.includes("holds more")) return "Think about how much water each one can carry.";
  if (prompt.includes("what number is the word")) return "Say the word, then write the number.";
  if (prompt.includes("÷") && prompt.includes("+")) return "Divide first, then add.";
  if (/\dn \+/.test(prompt) && prompt.includes("what is n")) return "Undo the adding first, then share into equal groups.";

  const op = exercise.worked?.op;
  if (op === "+") return "Add the two amounts.";
  if (op === "-") return "Start with the first amount and take the second away.";
  if (op === "*") return "This is equal groups. Multiply.";
  if (op === "/") return "Share into equal groups.";
  if (op === "pct") return "Percent means out of one hundred.";
  if (op === "eq") return "Find the missing amount that makes both sides match.";
  if (exercise.numeric === "decimal") return "Use the dot key if you need a decimal point.";
  if (exercise.numeric === "negative") return "Tap plus-minus if the answer is below zero.";

  if (prompt.includes("longer") || prompt.includes("shorter")) return "Picture both, then pick the longer one.";
  if (prompt.includes("which word is")) return "Say the sounds, then pick the word.";
  if (prompt.includes("rhyme")) return "Listen for the ending sound.";
  if (exercise.kind === "choice") return "Pick the one that answers the question.";
  return "Look once more, then try a different answer.";
}
