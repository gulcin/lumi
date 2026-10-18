const listeners = new Set<() => void>();

export type FeedbackPlace = {
  screen: string;
  lesson: string;
  skill: string;
};

let place: FeedbackPlace = { screen: "loading", lesson: "", skill: "" };
let sheetOpen = false;

export function feedbackPlace(): FeedbackPlace {
  return place;
}

export function setFeedbackPlace(next: FeedbackPlace): void {
  if (next.screen === place.screen && next.lesson === place.lesson && next.skill === place.skill) return;
  place = next;
  listeners.forEach((listener) => listener());
}

export function tellSheetOpen(): boolean {
  return sheetOpen;
}

export function openTell(): void {
  sheetOpen = true;
  listeners.forEach((listener) => listener());
}

export function closeTell(): void {
  sheetOpen = false;
  listeners.forEach((listener) => listener());
}

export function subscribeTell(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
