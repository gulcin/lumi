import type { PypArea, PypThemeId } from "./types";

export const THEME_ART: Record<PypThemeId, string> = {
  "who-we-are": "themes/who-we-are",
  "where-we-are": "themes/where-we-are",
  "how-we-express": "themes/how-we-express",
  "how-the-world-works": "themes/how-the-world-works",
  "how-we-organise": "themes/how-we-organise",
  "sharing-the-planet": "themes/sharing-the-planet",
};

export const SUBJECT_ART: Record<string, string> = {
  Mathematics: "spots/maths",
  English: "spots/reading",
  Science: "spots/science",
  History: "spots/history",
  "Life Skills": "spots/cooking",
  "Personal & Social Development": "spots/animals",
  Computing: "spots/building",
  "Learning to Learn": "spots/reading",
};

export const AREA_ART: Record<PypArea, string> = {
  language: "spots/reading",
  maths: "spots/maths",
  science: "spots/science",
  "social studies": "spots/geography",
  arts: "spots/art",
  PSPE: "spots/sports",
};

export const INTEREST_ART: Record<string, string> = {
  animals: "spots/animals",
  dinosaurs: "spots/dinosaurs",
  space: "spots/space",
  art: "spots/art",
  music: "spots/music",
  building: "spots/building",
  nature: "spots/nature",
  oceans: "spots/oceans",
  sports: "spots/sports",
  cooking: "spots/cooking",
  stories: "spots/reading",
  places: "spots/history",
};

export function subjectArt(subject: string): string {
  return SUBJECT_ART[subject] ?? "spots/acorn";
}
