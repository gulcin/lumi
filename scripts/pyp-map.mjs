import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Unofficial map from a Marble (or Lumi) topic to one PYP transdisciplinary theme
 * and one subject area. Rules are domain-level, then a few keyword overrides.
 * Theme names match the public PYP framework. Descriptions here are Lumi's.
 */

export const THEMES = [
  { id: "who-we-are", name: "Who we are" },
  { id: "where-we-are", name: "Where we are in place and time" },
  { id: "how-we-express", name: "How we express ourselves" },
  { id: "how-the-world-works", name: "How the world works" },
  { id: "how-we-organise", name: "How we organise ourselves" },
  { id: "sharing-the-planet", name: "Sharing the planet" },
];

export const AREAS = ["language", "maths", "science", "social studies", "arts", "PSPE"];

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));
const AREA_IDS = new Set(AREAS);

/** subject|domain or subject|* → [theme, area] */
const DOMAIN_RULES = {
  "Mathematics|Addition & Subtraction": ["how-the-world-works", "maths"],
  "Mathematics|Algebra": ["how-the-world-works", "maths"],
  "Mathematics|Counting & Cardinality": ["how-the-world-works", "maths"],
  "Mathematics|Fractions": ["how-the-world-works", "maths"],
  "Mathematics|Geometry": ["how-the-world-works", "maths"],
  "Mathematics|Mathematical Thinking": ["how-the-world-works", "maths"],
  "Mathematics|Measurement": ["how-the-world-works", "maths"],
  "Mathematics|Multiplication & Division": ["how-the-world-works", "maths"],
  "Mathematics|Number Representation & Place Value": ["how-the-world-works", "maths"],
  "Mathematics|Ratio & Proportion": ["how-the-world-works", "maths"],
  "Mathematics|Data & Statistics": ["how-we-organise", "maths"],
  "Mathematics|Probability": ["how-we-organise", "maths"],

  "English|Grammar & Punctuation": ["how-we-express", "language"],
  "English|Phonics & Word Reading": ["how-we-express", "language"],
  "English|Reading Comprehension": ["how-we-express", "language"],
  "English|Spelling & Word Study": ["how-we-express", "language"],
  "English|Vocabulary": ["how-we-express", "language"],
  "English|Speaking & Listening": ["how-we-express", "language"],
  "English|English Thinking": ["how-we-express", "language"],
  "English|Writing Composition": ["how-we-express", "arts"],
  "English|Handwriting & Transcription": ["how-we-express", "arts"],

  "History|*": ["where-we-are", "social studies"],

  "Science|The Human Body": ["who-we-are", "science"],
  "Science|Organisms & Life Processes": ["sharing-the-planet", "science"],
  "Science|Animals of the World": ["sharing-the-planet", "science"],
  "Science|Insects & Minibeasts": ["sharing-the-planet", "science"],
  "Science|Ocean Life": ["sharing-the-planet", "science"],
  "Science|Rainforests": ["sharing-the-planet", "science"],
  "Science|Polar Regions": ["sharing-the-planet", "science"],
  "Science|Ecosystems & Habitats": ["sharing-the-planet", "science"],
  "Science|Weather & Climate": ["sharing-the-planet", "science"],
  "Science|Dinosaurs & Paleontology": ["where-we-are", "science"],
  "Science|Space Systems & Earth's History": ["where-we-are", "science"],
  "Science|Earth's Systems": ["how-the-world-works", "science"],
  "Science|Energy": ["how-the-world-works", "science"],
  "Science|Forces & Motion": ["how-the-world-works", "science"],
  "Science|Matter & Materials": ["how-the-world-works", "science"],
  "Science|Scientific Inquiry": ["how-the-world-works", "science"],
  "Science|Space Exploration": ["how-the-world-works", "science"],
  "Science|Volcanoes & Earthquakes": ["how-the-world-works", "science"],
  "Science|Waves, Light & Sound": ["how-the-world-works", "science"],

  "Life Skills|*": ["how-we-organise", "social studies"],
  "Personal & Social Development|*": ["who-we-are", "PSPE"],
  "Computing|*": ["how-the-world-works", "science"],
  "Learning to Learn|*": ["who-we-are", "PSPE"],
};

const MONEY = /\b(money|coin|coins|budget|price|cost|wage|tax)\b/i;
const EXPRESS_ARTS = /\b(poem|poetry|paint|painting|music|song|draw|drawing)\b/i;

export function mapTopic(topic) {
  const specific = DOMAIN_RULES[`${topic.subject}|${topic.domain}`];
  const fallback = DOMAIN_RULES[`${topic.subject}|*`];
  const rule = specific ?? fallback;
  if (!rule) return null;
  let [theme, area] = rule;
  if (topic.subject === "Mathematics" && MONEY.test(`${topic.name} ${topic.description}`)) {
    theme = "how-we-organise";
    area = "maths";
  }
  if (topic.subject === "English" && EXPRESS_ARTS.test(topic.name)) {
    theme = "how-we-express";
    area = "arts";
  }
  return { theme, area };
}

export function buildThemeMap(topics) {
  const mapped = {};
  const missing = [];
  for (const topic of topics) {
    const entry = mapTopic(topic);
    if (!entry || !THEME_IDS.has(entry.theme) || !AREA_IDS.has(entry.area)) {
      missing.push({ id: topic.id, subject: topic.subject, domain: topic.domain, name: topic.name });
      continue;
    }
    mapped[topic.id] = entry;
  }
  return {
    version: 1,
    unofficial: true,
    note: "Unofficial Lumi map onto public PYP transdisciplinary theme names and a subject area. Not endorsed by the International Baccalaureate. Only theme names and learner-profile trait names come from the public framework.",
    themes: THEMES,
    areas: AREAS,
    topics: mapped,
    missing,
  };
}

function loadTopics(root) {
  const marble = JSON.parse(fs.readFileSync(path.join(root, "vendor/marble/topics.json"), "utf8"));
  const additions = JSON.parse(fs.readFileSync(path.join(root, "vendor/lumi/additions.json"), "utf8"));
  return [...marble.topics, ...additions.topics];
}

export function writeThemeMap(root) {
  const map = buildThemeMap(loadTopics(root));
  if (map.missing.length) {
    const sample = map.missing
      .slice(0, 12)
      .map((topic) => `${topic.subject} / ${topic.domain} (${topic.id})`)
      .join("\n");
    throw new Error(`Unmapped topics (${map.missing.length}):\n${sample}`);
  }
  const payload = {
    version: map.version,
    unofficial: true,
    note: map.note,
    themes: map.themes,
    areas: map.areas,
    topics: map.topics,
  };
  const file = path.join(root, "src/data/pyp-theme-map.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(payload)}\n`);
  return { file, count: Object.keys(payload.topics).length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const written = writeThemeMap(root);
  console.log(`Wrote ${path.relative(root, written.file)} (${written.count} topics)`);
}
