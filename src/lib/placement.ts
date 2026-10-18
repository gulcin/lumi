import type { Exercise } from "./generators/types";
import type { Placement, PlacementLevel } from "./types";

/** Grade 1 sits near age 6. Grade 3, the default, sits near age 8. */
export const DEFAULT_START_GRADE = 3;
export const MIN_START_GRADE = 1;
export const MAX_START_GRADE = 8;

export function clampGrade(grade: number | undefined): number {
  if (grade == null || !Number.isFinite(grade)) return DEFAULT_START_GRADE;
  return Math.min(MAX_START_GRADE, Math.max(MIN_START_GRADE, Math.round(grade)));
}

/** Typical age at the start of a school grade. Grade 3 → 8. */
export function gradeAnchorAge(grade: number): number {
  return clampGrade(grade) + 5;
}

export function placementFromScore(correct: number, total: number, now: number, startGrade = DEFAULT_START_GRADE): Placement {
  const grade = clampGrade(startGrade);
  const anchor = gradeAnchorAge(grade);
  const safeTotal = Math.max(1, total);
  let shift = 0;
  let level: PlacementLevel = "ready";
  if (correct <= Math.floor(safeTotal * 0.25)) {
    shift = 2;
    level = "emerging";
  } else if (correct <= Math.floor(safeTotal * 0.62)) {
    shift = 1;
    level = "growing";
  }
  const bandStart = Math.max(5, anchor - shift);
  const bandEnd = bandStart + 1;
  const assumedThroughAge = Math.max(4, bandStart - 1);
  return { level, bandStart, bandEnd, assumedThroughAge, correct, total, at: now, startGrade: grade };
}

export function levelCopy(level: PlacementLevel, startGrade = DEFAULT_START_GRADE): string {
  const grade = clampGrade(startGrade);
  const age = gradeAnchorAge(grade);
  if (level === "emerging") {
    return `Starting below grade ${grade}, filling gaps, then climbing with no ceiling.`;
  }
  if (level === "growing") {
    return `Building just under grade ${grade}, with room to go back to gaps and upward with no cap.`;
  }
  return `Ready for grade ${grade} lessons, around age ${age}, and onward with no age cap.`;
}

function numberItem(id: string, prompt: string, speak: string, explain: string, answer: number, equation: string): Exercise {
  const op = equation.includes("×") ? "*" : equation.includes("÷") ? "/" : equation.includes("−") || equation.includes("-") ? "-" : "+";
  const parts = equation.split(/[×÷+−-]/).map((part) => Number(part.trim()));
  const worked =
    parts.length === 2 && parts.every((part) => Number.isFinite(part))
      ? { op: op as "+" | "-" | "*" | "/", a: parts[0]!, b: parts[1]!, answer }
      : undefined;
  return {
    id,
    topicId: "placement",
    generatorId: "placement",
    kind: "number",
    numeric: "int",
    prompt,
    speak,
    explain,
    answer,
    visual: { type: "equation", text: equation },
    worked,
  };
}

function choiceItem(id: string, prompt: string, speak: string, explain: string, labels: string[], correctIndex: number): Exercise {
  return {
    id,
    topicId: "placement",
    generatorId: "placement",
    kind: "choice",
    prompt,
    speak,
    explain,
    choices: labels.map((label, index) => ({ id: `c${index}`, label })),
    correctId: `c${correctIndex}`,
  };
}

const GRADE_1: Exercise[] = [
  numberItem("place-count", "How many stars?", "How many stars do you see?", "There are 5 stars.", 5, "5"),
  numberItem("place-add", "4 + 5", "What is 4 plus 5?", "4 plus 5 is 9.", 9, "4 + 5"),
  choiceItem("place-rhyme", "Which word rhymes with log?", "Which word rhymes with log?", "Dog rhymes with log.", ["dog", "sun", "cup"], 0),
  numberItem("place-sub", "14 − 6", "What is 14 minus 6?", "14 minus 6 is 8.", 8, "14 − 6"),
  numberItem("place-half", "What is half of 10?", "What is half of 10?", "Half of 10 is 5.", 5, "10 ÷ 2"),
  numberItem("place-times", "3 × 4", "What is 3 times 4?", "3 times 4 is 12.", 12, "3 × 4"),
  numberItem("place-tens", "How many tens are in 46?", "How many tens are in 46?", "46 has 4 tens.", 4, "46"),
  numberItem("place-add2", "25 + 10", "What is 25 plus 10?", "25 plus 10 is 35.", 35, "25 + 10"),
];

const GRADE_3: Exercise[] = [
  numberItem("g3-times", "6 × 7", "What is 6 times 7?", "6 times 7 is 42.", 42, "6 × 7"),
  numberItem("g3-hundreds", "How many hundreds are in 482?", "How many hundreds are in 482?", "482 has 4 hundreds.", 4, "482"),
  numberItem("g3-div", "56 ÷ 7", "What is 56 divided by 7?", "56 divided by 7 is 8.", 8, "56 ÷ 7"),
  numberItem("g3-quarter", "What is 1/4 of 20?", "What is one quarter of 20?", "One quarter of 20 is 5.", 5, "20 ÷ 4"),
  choiceItem(
    "g3-verb",
    "Which word is a verb?",
    "Which word is a verb? Jump, blue, or soft.",
    "Jump is a verb. It is an action.",
    ["jump", "blue", "soft"],
    0,
  ),
  numberItem("g3-add", "350 + 125", "What is 350 plus 125?", "350 plus 125 is 475.", 475, "350 + 125"),
  numberItem("g3-round", "Round 64 to the nearest 10.", "Round 64 to the nearest 10.", "64 is nearer to 60 than to 70.", 60, "64"),
  choiceItem(
    "g3-question",
    "Which one is a question?",
    "Which one is a question?",
    "A question asks something and ends with a question mark.",
    ["Where is the river?", "The river is wide.", "A wide river"],
    0,
  ),
];

const GRADE_5: Exercise[] = [
  numberItem("g5-times", "12 × 8", "What is 12 times 8?", "12 times 8 is 96.", 96, "12 × 8"),
  numberItem("g5-div", "144 ÷ 12", "What is 144 divided by 12?", "144 divided by 12 is 12.", 12, "144 ÷ 12"),
  numberItem("g5-frac", "What is 3/4 of 20?", "What is three quarters of 20?", "Three quarters of 20 is 15.", 15, "20"),
  numberItem("g5-place", "What is the value of the 6 in 3,628?", "What is the value of the 6 in 3628?", "The 6 is in the hundreds place, so its value is 600.", 600, "3628"),
  choiceItem(
    "g5-sentence",
    "Which sentence uses a comma in a list?",
    "Which sentence uses a comma in a list?",
    "Commas separate items in a list.",
    ["We packed bread, cheese, and apples.", "We packed bread.", "Packed the bread"],
    0,
  ),
  numberItem("g5-sub", "1,000 − 250", "What is 1000 minus 250?", "1000 minus 250 is 750.", 750, "1000 − 250"),
  numberItem("g5-area", "A rectangle is 6 cm by 4 cm. What is its area in square cm?", "A rectangle is 6 by 4. What is its area?", "Area is 6 times 4, which is 24.", 24, "6 × 4"),
  choiceItem(
    "g5-infer",
    "The path was muddy and the sky was dark. What is a fair guess?",
    "The path was muddy and the sky was dark. What is a fair guess?",
    "Mud and a dark sky suggest rain.",
    ["It had been raining.", "The path was made of glass.", "It was noon on a dry day."],
    0,
  ),
];

/** Eight warm-up items aimed at the chosen grade. Grade 3 is the default. */
export function placementItems(startGrade = DEFAULT_START_GRADE): Exercise[] {
  const grade = clampGrade(startGrade);
  if (grade <= 2) return GRADE_1;
  if (grade <= 4) return GRADE_3;
  return GRADE_5;
}

/** Kept for older imports. The live warm-up uses placementItems(startGrade). */
export const PLACEMENT_ITEMS = GRADE_3;
