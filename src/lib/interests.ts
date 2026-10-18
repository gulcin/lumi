import type { Topic } from "./types";

export type Interest = {
  id: string;
  label: string;
  emoji: string;
  speak: string;
  domains: string[];
  keywords: string[];
};

export const INTERESTS: Interest[] = [
  { id: "animals", label: "Animals", emoji: "🐾", speak: "Animals", domains: ["Animals of the World", "Organisms & Life Processes", "Insects & Minibeasts"], keywords: ["animal", "mammal", "bird", "habitat"] },
  { id: "dinosaurs", label: "Dinosaurs", emoji: "🦕", speak: "Dinosaurs", domains: ["Dinosaurs & Paleontology"], keywords: ["dinosaur", "fossil"] },
  { id: "space", label: "Space", emoji: "🪐", speak: "Space", domains: ["Space Exploration", "Space Systems & Earth's History"], keywords: ["planet", "star", "moon", "space"] },
  { id: "art", label: "Art", emoji: "🎨", speak: "Art", domains: ["Writing Composition", "Handwriting & Transcription"], keywords: ["art", "paint", "draw", "poem"] },
  { id: "music", label: "Music", emoji: "🎵", speak: "Music", domains: [], keywords: ["music", "song", "sound", "rhythm"] },
  { id: "building", label: "Building", emoji: "🧱", speak: "Building", domains: ["Geometry", "Forces & Motion", "Matter & Materials"], keywords: ["build", "shape", "material", "structure"] },
  { id: "nature", label: "Nature", emoji: "🌿", speak: "Nature", domains: ["Ecosystems & Habitats", "Earth's Systems", "Weather & Climate", "Rainforests", "Polar Regions"], keywords: ["plant", "forest", "weather"] },
  { id: "oceans", label: "Oceans", emoji: "🌊", speak: "Oceans", domains: ["Ocean Life"], keywords: ["ocean", "sea", "whale"] },
  { id: "sports", label: "Sports", emoji: "⚽", speak: "Sports", domains: ["The Human Body"], keywords: ["sport", "game", "move", "muscle"] },
  { id: "cooking", label: "Cooking", emoji: "🍲", speak: "Cooking", domains: ["The Human Body"], keywords: ["food", "cook", "meal"] },
  { id: "stories", label: "Stories", emoji: "📖", speak: "Stories", domains: ["Reading Comprehension", "Writing Composition", "Vocabulary"], keywords: ["story", "read", "character"] },
  { id: "places", label: "People and places", emoji: "🗺️", speak: "People and places", domains: ["Ancient Egypt", "Ancient Greece & Rome", "Medieval Times", "Stone Age", "Historical Thinking"], keywords: ["egypt", "rome", "village", "king"] },
];

export function interestById(id: string): Interest | undefined {
  return INTERESTS.find((item) => item.id === id);
}

export function topicMatchesInterest(topic: Topic, interest: Interest): boolean {
  if (interest.domains.includes(topic.domain)) return true;
  const hay = `${topic.name} ${topic.description}`.toLowerCase();
  return interest.keywords.some((word) => hay.includes(word));
}

/** Extra weight inside the current frontier. Prerequisites are still required elsewhere. */
export function interestBoost(topic: Topic, interestIds: string[] | undefined): number {
  if (!interestIds?.length) return 0;
  const matched = interestIds.some((id) => {
    const interest = interestById(id);
    return interest ? topicMatchesInterest(topic, interest) : false;
  });
  return matched ? 28 : 0;
}
