let lesson = false;
const listeners = new Set<() => void>();

export function setLessonInProgress(value: boolean): void {
  if (lesson === value) return;
  lesson = value;
  listeners.forEach((listener) => listener());
}

export function isLessonInProgress(): boolean {
  return lesson;
}

export function subscribeLesson(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
