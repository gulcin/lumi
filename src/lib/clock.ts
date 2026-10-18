import type { Exercise } from "./generators/types";

/** Minute hand: 6° per minute. Hour hand: 30° per hour, plus half a degree per minute. */
export function clockHandAngles(hour: number, minute: number): { minute: number; hour: number } {
  return {
    minute: minute * 6,
    hour: (hour % 12) * 30 + minute * 0.5,
  };
}

export function clockSpoken(hour: number, minute: number): string {
  if (minute === 0) return `${hour} o'clock`;
  if (minute === 15) return `quarter past ${hour}`;
  if (minute === 30) return `half past ${hour}`;
  if (minute === 45) return `quarter to ${(hour % 12) + 1}`;
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

/** A fixed clock question, used so screenshots can show 3:00, half past, quarter past, and quarter to. */
export function clockExercise(topicId: string, hour: number, minute: number): Exercise {
  const spoken = clockSpoken(hour, minute);
  const visual = { type: "clock" as const, hour, minute };
  if (minute === 0) {
    return {
      id: `clock_${hour}_${minute}`,
      topicId,
      generatorId: "time",
      kind: "number",
      prompt: "What hour is it?",
      speak: "What hour does the clock show?",
      explain: `The short hand is on ${hour}. It is ${spoken}.`,
      answer: hour,
      visual,
    };
  }
  const sameHour = minute === 45 ? `half past ${hour}` : minute === 30 ? `quarter past ${hour}` : `half past ${hour}`;
  const choices = [
    { id: "c0", label: spoken },
    { id: "c1", label: `${hour} o'clock` },
    { id: "c2", label: sameHour },
  ];
  return {
    id: `clock_${hour}_${minute}`,
    topicId,
    generatorId: "time",
    kind: "choice",
    prompt: "What time is it?",
    speak: "What time does the clock show?",
    explain: `This is ${spoken}.`,
    choices,
    correctId: "c0",
    visual,
  };
}
