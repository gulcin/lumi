/** Kid-safe words. Four of these plus 8 hex characters is the family sync code. */
export const CODE_WORDS = [
  "apple", "river", "maple", "otter", "sunny", "pebble", "willow", "cocoa",
  "harbor", "meadow", "lantern", "badger", "comet", "daisy", "ember", "finch",
  "garden", "honey", "island", "jasmine", "kettle", "lemon", "mango", "noodle",
  "olive", "panda", "quartz", "robin", "sailor", "tulip", "umbra", "violet",
  "walnut", "yarrow", "zephyr", "acorn", "birch", "cloud", "drift", "echo",
  "flint", "grove", "hazel", "ivy", "juniper", "koala", "lark", "moss",
  "nest", "orchid", "pine", "quail", "reed", "sage", "thistle", "umber",
  "vine", "wren", "amber", "brook", "cedar", "dune", "fern", "glade",
  "heron", "iris", "jade", "kelp", "lily", "mink", "north", "opal",
  "pearl", "quince", "raven", "spruce", "tide", "ursa", "vale", "wheat",
  "aster", "blossom", "cinder", "dew", "elm", "fable", "goose", "hill",
  "ink", "jelly", "kite", "lake", "mint", "nimbus", "oak", "plum",
  "rain", "star", "trail", "upland", "violet", "wave", "yarn", "zinc",
  "anchor", "berry", "canoe", "delta", "eagle", "frost", "grain", "harp",
  "inlet", "jasper", "kernel", "lotus", "marble", "nectar", "orbit", "poppy",
  "quest", "ridge", "shell", "timber", "unity", "vista", "whisper", "yew",
  "alpine", "breeze", "coral", "daisy", "estuary", "fox", "glow", "haven",
  "indigo", "jewel", "kindling", "lagoon", "mist", "nova", "oasis", "pebble",
  "ripple", "summit", "thicket", "ultra", "velvet", "willow", "zenith", "apricot",
  "bunting", "cliff", "dragon", "ember", "fjord", "garlic", "horizon", "icicle",
  "jungle", "kayak", "lichen", "meadow", "nutmeg", "otter", "prairie", "quartz",
  "rapids", "saffron", "turnip", "umbrella", "valley", "walnut", "xylophone", "yogurt",
  "zephyr", "badger", "canyon", "dolphin", "engine", "forest", "galaxy", "hammock",
  "igloo", "jacket", "kitten", "ladder", "magnet", "needle", "orange", "pencil",
  "quilt", "rocket", "saddle", "tunnel", "unicorn", "violin", "window", "yellow",
] as const;

const UNIQUE_WORDS = [...new Set(CODE_WORDS)];

function bytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

/** Four words and 8 hex characters. Unguessable, and safe to read aloud. */
export function createFamilyCode(): string {
  const random = bytes(4 + 4);
  const words = [0, 1, 2, 3].map((index) => UNIQUE_WORDS[random[index]! % UNIQUE_WORDS.length]!);
  const hex = [...random.slice(4)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${words.join("-")}-${hex}`;
}

export function isFamilyCode(value: string): boolean {
  const parts = value.trim().toLowerCase().split("-");
  if (parts.length !== 5) return false;
  if (!parts.slice(0, 4).every((word) => /^[a-z]{2,12}$/.test(word))) return false;
  return /^[a-f0-9]{8}$/.test(parts[4] ?? "");
}

export function normalizeFamilyCode(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
