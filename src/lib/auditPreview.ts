import type { Exercise } from "./generators/types";

let preview: Exercise | null = null;

export function setAuditPreview(exercise: Exercise | null): void {
  preview = exercise;
}

export function auditPreview(): Exercise | null {
  return preview;
}
