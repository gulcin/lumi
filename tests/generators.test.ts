import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "../src/lib/catalog";
import { answersMatch, createExercise, exerciseFromSeed, hasHandsOn, talkCard } from "../src/lib/generators";
import type { Exercise, Worked } from "../src/lib/generators/types";
import { mulberry32 } from "../src/lib/rng";
import type { TaxonomyFile, Topic } from "../src/lib/types";

function topic(partial: Partial<Topic> & Pick<Topic, "id" | "name" | "domain" | "subject">): Topic {
  return {
    type: "PROCEDURAL",
    description: partial.name,
    ageRangeStart: 7,
    ageRangeEnd: 8,
    evidence: ["Explain it in their own words"],
    assessmentPrompt: "Can they show it?",
    ...partial,
  };
}

function assertShape(exercise: Exercise) {
  expect(exercise.prompt.length).toBeGreaterThan(0);
  expect(exercise.speak.length).toBeGreaterThan(0);
  expect(exercise.explain.length).toBeGreaterThan(0);
  if (exercise.kind === "choice") {
    expect(exercise.choices?.some((choice) => choice.id === exercise.correctId)).toBe(true);
    expect(new Set(exercise.choices?.map((choice) => choice.label)).size).toBe(exercise.choices?.length);
  }
  if (exercise.kind === "number") {
    expect(typeof exercise.answer).toBe("number");
    expect(Number.isFinite(exercise.answer)).toBe(true);
  }
  if (exercise.kind === "order") {
    const ids = (exercise.items ?? []).map((item) => item.id).sort();
    expect([...(exercise.correctOrder ?? [])].sort()).toEqual(ids);
  }
  if (exercise.kind === "talk") {
    expect(exercise.talkPoints?.length).toBeGreaterThan(0);
  }
}

function assertWorked(worked: Worked | undefined) {
  if (!worked) return;
  const { op, a, b, answer } = worked;
  if (op === "+") expect(a + b).toBeCloseTo(answer);
  if (op === "-") expect(a - b).toBeCloseTo(answer);
  if (op === "*") expect(a * b).toBeCloseTo(answer);
  if (op === "/") expect(b === 0 ? NaN : a / b).toBeCloseTo(answer);
  if (op === "pct") expect((a / 100) * b).toBeCloseTo(answer);
  if (op === "eq") expect(a + answer).toBeCloseTo(b);
}

describe("exercise generators", () => {
  const samples: Topic[] = [
    topic({ id: "c", name: "Counting objects to 20", subject: "Mathematics", domain: "Counting & Cardinality", ageRangeStart: 5, ageRangeEnd: 6 }),
    topic({ id: "b", name: "Number bonds", subject: "Mathematics", domain: "Addition & Subtraction", ageRangeStart: 6, ageRangeEnd: 7 }),
    topic({ id: "a20", name: "Adding and subtracting within 20", subject: "Mathematics", domain: "Addition & Subtraction", ageRangeStart: 6, ageRangeEnd: 7 }),
    topic({ id: "a100", name: "Adding within 100", subject: "Mathematics", domain: "Addition & Subtraction", ageRangeStart: 7, ageRangeEnd: 8 }),
    topic({ id: "pv", name: "A Ten Is Ten Ones", subject: "Mathematics", domain: "Number Representation & Place Value", ageRangeStart: 6, ageRangeEnd: 7 }),
    topic({ id: "dec", name: "Decimal place value", subject: "Mathematics", domain: "Fractions", ageRangeStart: 9, ageRangeEnd: 10 }),
    topic({ id: "fr", name: "What Is a Half?", subject: "Mathematics", domain: "Fractions", ageRangeStart: 5, ageRangeEnd: 6 }),
    topic({ id: "mul", name: "Times tables", subject: "Mathematics", domain: "Multiplication & Division", ageRangeStart: 7, ageRangeEnd: 8 }),
    topic({ id: "div", name: "Division as equal sharing", subject: "Mathematics", domain: "Multiplication & Division", ageRangeStart: 6, ageRangeEnd: 8 }),
    topic({ id: "sh", name: "2-D shapes", subject: "Mathematics", domain: "Geometry", ageRangeStart: 5, ageRangeEnd: 6 }),
    topic({ id: "time", name: "Telling Time: Hours and Half Hours", subject: "Mathematics", domain: "Measurement", ageRangeStart: 6, ageRangeEnd: 7 }),
    topic({ id: "coin", name: "Coin Values", subject: "Mathematics", domain: "Measurement", ageRangeStart: 6, ageRangeEnd: 7 }),
    topic({ id: "alg", name: "Solving Linear Equations", subject: "Mathematics", domain: "Algebra", ageRangeStart: 11, ageRangeEnd: 14 }),
    topic({ id: "seq", name: "Linear number sequences", subject: "Mathematics", domain: "Algebra", ageRangeStart: 10, ageRangeEnd: 11 }),
    topic({ id: "ratio", name: "Ratio Problems", subject: "Mathematics", domain: "Ratio & Proportion", ageRangeStart: 10, ageRangeEnd: 11 }),
    topic({ id: "pct", name: "Calculating Percentages", subject: "Mathematics", domain: "Ratio & Proportion", ageRangeStart: 10, ageRangeEnd: 11 }),
    topic({ id: "rhy", name: "Rhyming words", subject: "English", domain: "Phonics & Word Reading", ageRangeStart: 5, ageRangeEnd: 6 }),
    topic({ id: "sight", name: "Reading High-Frequency Words by Sight", subject: "English", domain: "Phonics & Word Reading", ageRangeStart: 6, ageRangeEnd: 8 }),
    topic({ id: "gram", name: "Expanded noun phrases", subject: "English", domain: "Grammar & Punctuation", ageRangeStart: 7, ageRangeEnd: 9 }),
    topic({ id: "sent", name: "Building sentences", subject: "English", domain: "Grammar & Punctuation", ageRangeStart: 5, ageRangeEnd: 6 }),
    topic({ id: "spell", name: "Homophones", subject: "English", domain: "Spelling & Word Study", ageRangeStart: 8, ageRangeEnd: 10 }),
  ];

  it("builds valid hands-on items for core and older topics", () => {
    for (const sample of samples) {
      expect(hasHandsOn(sample)).toBe(true);
      for (let seed = 1; seed <= 12; seed++) {
        const exercise = createExercise(sample, mulberry32(seed));
        assertShape(exercise);
        assertWorked(exercise.worked);
        expect(exercise.generatorId).not.toBe("talk");
        if (exercise.kind === "number" && exercise.generatorId === "addition" && sample.id === "a20") {
          expect(exercise.answer).toBeLessThanOrEqual(40);
        }
      }
    }
  });

  it("is deterministic for a seed", () => {
    const sample = samples[2]!;
    const first = exerciseFromSeed(sample, 42);
    const second = exerciseFromSeed(sample, 42);
    expect(second.prompt).toBe(first.prompt);
    expect(second.answer).toBe(first.answer);
    expect(second.correctId).toBe(first.correctId);
  });

  it("checks each response kind", () => {
    const choice = createExercise(samples[16]!, mulberry32(3));
    expect(choice.kind === "choice" ? answersMatch(choice, choice.correctId ?? "") : true).toBe(true);
    const talk = talkCard(topic({ id: "meta", name: "Being a friend", subject: "Personal & Social Development", domain: "Friendship & Cooperation", evidence: ["Names a kind action"] }));
    expect(talk.kind).toBe("talk");
    expect(answersMatch(talk, "talked")).toBe(true);
    expect(answersMatch(talk, "no")).toBe(false);
  });

  it("falls back to a talk card when no generator fits", () => {
    const soft = topic({
      id: "feel",
      name: "Naming big feelings",
      subject: "Personal & Social Development",
      domain: "Emotional Literacy",
      description: "Notice feelings in the body and give them names.",
      evidence: ["Names happy, sad, and cross", "Says what they need"],
    });
    const exercise = createExercise(soft, mulberry32(1));
    expect(exercise.generatorId).toBe("talk");
    expect(exercise.talkPoints?.[0]).toMatch(/happy/i);
  });
});

describe("full taxonomy coverage", () => {
  const file = JSON.parse(readFileSync(new URL("../public/data/taxonomy.json", import.meta.url), "utf8")) as TaxonomyFile;
  const catalog = buildCatalog(file);

  it("covers every topic with either a hands-on item or a talk card", () => {
    const bySubject: Record<string, { hands: number; talk: number }> = {};
    for (const topic of catalog.topics) {
      const exercise = createExercise(topic, mulberry32(7));
      assertShape(exercise);
      const row = (bySubject[topic.subject] ??= { hands: 0, talk: 0 });
      if (exercise.generatorId === "talk") row.talk += 1;
      else row.hands += 1;
    }
    const marble = catalog.topics.filter((topic) => !topic.id.startsWith("lumi_"));
    const added = catalog.topics.filter((topic) => topic.id.startsWith("lumi_"));
    expect(marble).toHaveLength(1590);
    expect(added.length).toBeGreaterThan(0);
    expect(catalog.subjects).toHaveLength(8);
    const hands = Object.values(bySubject).reduce((sum, row) => sum + row.hands, 0);
    const talk = Object.values(bySubject).reduce((sum, row) => sum + row.talk, 0);
    expect(hands + talk).toBe(catalog.topics.length);
    expect(bySubject.Mathematics?.hands).toBeGreaterThan(350);
    expect(bySubject.English?.hands).toBeGreaterThan(120);
    console.log("generator coverage", bySubject);
  });
});
