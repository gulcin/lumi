import type { Catalog, PypArea, PypThemeId, Topic } from "./types";

export const PYP_THEMES: { id: PypThemeId; name: string; blurb: string; emoji: string }[] = [
  { id: "who-we-are", name: "Who we are", blurb: "Bodies, feelings, and what makes you you.", emoji: "🧡" },
  { id: "where-we-are", name: "Where we are in place and time", blurb: "Stories, places, and how life changes.", emoji: "🗺️" },
  { id: "how-we-express", name: "How we express ourselves", blurb: "Words, pictures, and ways to share ideas.", emoji: "🎨" },
  { id: "how-the-world-works", name: "How the world works", blurb: "Patterns, forces, and how things happen.", emoji: "🔬" },
  { id: "how-we-organise", name: "How we organise ourselves", blurb: "Groups, systems, and ways people work together.", emoji: "🤝" },
  { id: "sharing-the-planet", name: "Sharing the planet", blurb: "Living things, places, and looking after them.", emoji: "🌍" },
];

export const PYP_AREAS: { id: PypArea; name: string }[] = [
  { id: "language", name: "Language" },
  { id: "maths", name: "Maths" },
  { id: "science", name: "Science" },
  { id: "social studies", name: "Social studies" },
  { id: "arts", name: "Arts" },
  { id: "PSPE", name: "PSPE" },
];

export const LEARNER_TRAITS: { id: import("./types").LearnerTrait; name: string; hint: string }[] = [
  { id: "inquirer", name: "Inquirer", hint: "Exploring a lesson on the map" },
  { id: "knowledgeable", name: "Knowledgeable", hint: "Mastering a skill" },
  { id: "thinker", name: "Thinker", hint: "Solving a step at the frontier" },
  { id: "communicator", name: "Communicator", hint: "Explaining an idea out loud" },
  { id: "principled", name: "Principled", hint: "Staying with a tricky try" },
  { id: "open-minded", name: "Open-minded", hint: "Trying a different kind of lesson" },
  { id: "caring", name: "Caring", hint: "Looking after an idea or a place" },
  { id: "risk-taker", name: "Risk-taker", hint: "Trying a harder one" },
  { id: "balanced", name: "Balanced", hint: "Mixing more than one kind of lesson" },
  { id: "reflective", name: "Reflective", hint: "Saying what you found out" },
];

export const PYP_NOTE =
  "Groups and badges use the public names of the IB Primary Years Programme (the six transdisciplinary themes and the learner profile). Lumi's link from each lesson to a theme is an unofficial map made from those public descriptions. The International Baccalaureate does not endorse Lumi.";

const THEME_IDEA: Record<PypThemeId, string> = {
  "who-we-are": "People learn about themselves and how they live.",
  "where-we-are": "Places and stories change across time.",
  "how-we-express": "People share ideas with words and making.",
  "how-the-world-works": "The world has patterns we can investigate.",
  "how-we-organise": "People build ways to live and work together.",
  "sharing-the-planet": "Living things share places and resources.",
};

export type Inquiry = {
  themeId: PypThemeId;
  themeName: string;
  centralIdea: string;
  wonder: string;
  lines: string[];
  spoken: string;
};

function shorten(text: string, max = 90): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function inquiryFor(topic: Topic, themeId: PypThemeId = "how-the-world-works"): Inquiry {
  const theme = PYP_THEMES.find((item) => item.id === themeId) ?? PYP_THEMES[3]!;
  const centralIdea = `${THEME_IDEA[theme.id]} This lesson looks at ${topic.name}.`;
  const wonder = `I wonder what is worth knowing about ${topic.name}.`;
  const evidence = (topic.evidence.length ? topic.evidence : [topic.assessmentPrompt]).slice(0, 3);
  const lines = evidence.map((line) => shorten(line));
  const spoken = `${wonder} ${centralIdea} We can ask: ${lines.join(". ")}.`;
  return { themeId: theme.id, themeName: theme.name, centralIdea, wonder, lines, spoken };
}

export function themeName(id: PypThemeId | undefined): string {
  return PYP_THEMES.find((theme) => theme.id === id)?.name ?? "A lesson";
}

export function areaName(id: PypArea | undefined): string {
  return PYP_AREAS.find((area) => area.id === id)?.name ?? "Lesson";
}

export function themeOf(catalog: Catalog, topicId: string): string {
  const theme = catalog.pypMap?.topics[topicId]?.theme;
  const area = catalog.pypMap?.topics[topicId]?.area;
  if (!theme) return "";
  return `${themeName(theme)} · ${areaName(area)}`;
}
