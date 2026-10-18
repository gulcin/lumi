import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "../src/lib/catalog";
import { checkExercise } from "../src/lib/exerciseAudit";
import { exerciseFromSeed } from "../src/lib/generators";
import type { TaxonomyFile } from "../src/lib/types";

const SEEDS = [1, 17, 42, 99, 256, 1024];

describe("every skill exercise", () => {
  const file = JSON.parse(readFileSync(new URL("../public/data/taxonomy.json", import.meta.url), "utf8")) as TaxonomyFile;
  const catalog = buildCatalog(file);

  it("is answerable and matches its picture across seeds", () => {
    const problems: string[] = [];
    const generators = new Map<string, number>();
    for (const topic of catalog.topics) {
      for (const seed of SEEDS) {
        const exercise = exerciseFromSeed(topic, seed);
        generators.set(exercise.generatorId, (generators.get(exercise.generatorId) ?? 0) + 1);
        for (const issue of checkExercise(topic, exercise)) {
          if (problems.length < 40) problems.push(`${topic.subject} · ${topic.name} · ${exercise.generatorId} · seed ${seed}: ${issue}`);
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
    expect(generators.size).toBeGreaterThan(5);
  });

  it("does not ask a neighbouring fact for a different skill", () => {
    const banned: [string, RegExp][] = [
      ["Cleopatra and the End of Egypt", /pyramids/i],
      ["Ancient Egypt's Lasting Legacy", /Hieroglyphs/],
      ["Alexander the Great's Empire", /Athens|Olympic|Colosseum/],
      ["Structural Adaptations", /whale/i],
      ["What uses electricity at home", /Sunlight/],
    ];
    for (const [name, prompt] of banned) {
      const topic = catalog.topics.find((item) => item.name === name);
      expect(topic, name).toBeTruthy();
      for (const seed of SEEDS) {
        const exercise = exerciseFromSeed(topic!, seed);
        expect(exercise.prompt, `${name} seed ${seed}`).not.toMatch(prompt);
      }
    }
    const pyramids = catalog.topics.find((item) => item.name === "Who Really Built the Pyramids");
    const pharaoh = catalog.topics.find((item) => item.name === "The Pharaoh as Living God");
    const lamp = catalog.topics.find((item) => item.name === "What uses electricity at home");
    expect(exerciseFromSeed(pyramids!, 17).prompt).toMatch(/pyramid/i);
    expect(exerciseFromSeed(pharaoh!, 17).prompt).toMatch(/pharaoh/i);
    expect(exerciseFromSeed(lamp!, 17).prompt).toMatch(/electricity/i);
    const reading = catalog.topics.find((item) => item.name === "Reading for Meaning");
    const talk = exerciseFromSeed(reading!, 17);
    expect(talk.talkPoints?.join(" ") ?? "").not.toMatch(/Gough|research|hypothesis/i);
  });
});
