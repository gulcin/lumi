export const FEEDBACK_KEY = "lumi.feedback.v1";
export const MUM_EMAIL = "gulcin.yildirim@clickhouse.com";
export const MAILTO_LIMIT = 1800;

export type FeedbackKind = "bug" | "idea";

export type FeedbackReport = {
  id: string;
  kind: FeedbackKind;
  note: string;
  screen: string;
  lesson: string;
  skill: string;
  version: string;
  device: string;
  viewport: string;
  createdAt: number;
  sentAt?: number;
};

const SCREEN_LABEL: Record<string, string> = {
  loading: "Getting ready",
  error: "Lesson book",
  name: "Name",
  home: "Home",
  placement: "Warm-up",
  ready: "Ready",
  session: "Lesson",
  celebrate: "Lesson done",
  explore: "Explore",
  peek: "Lesson peek",
  gate: "Grown-ups",
  parent: "Grown-up view",
  theme: "Theme",
  interests: "What I love",
  shop: "Acorn shop",
  journal: "Show what I made",
  chat: "Ask Lumi",
  gplace: "Starting check",
};

export function screenLabel(screen: string): string {
  return SCREEN_LABEL[screen] ?? screen;
}

export function createReport(input: {
  kind: FeedbackKind;
  note: string;
  screen: string;
  lesson?: string;
  skill?: string;
  version: string;
  device: string;
  viewport: string;
  createdAt?: number;
  id?: string;
}): FeedbackReport {
  return {
    id: input.id ?? `r${input.createdAt ?? Date.now()}`,
    kind: input.kind,
    note: input.note.replace(/\s+/g, " ").trim().slice(0, 1000),
    screen: screenLabel(input.screen),
    lesson: (input.lesson ?? "").trim().slice(0, 160),
    skill: (input.skill ?? "").trim().slice(0, 80),
    version: input.version,
    device: input.device.replace(/\s+/g, " ").trim().slice(0, 160),
    viewport: input.viewport.slice(0, 32),
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function reportMailto(report: FeedbackReport): string {
  const subject = `Lumi report – ${report.version} – ${report.screen}`;
  let note = report.note;
  const hrefFor = (text: string) => {
    const lines = [
      `Type: ${report.kind === "bug" ? "Bug" : "Idea"}`,
      `Note: ${text || "(no note)"}`,
      `Screen: ${report.screen}`,
      report.lesson ? `Lesson: ${report.lesson}` : "",
      report.skill ? `Skill: ${report.skill}` : "",
      `Version: ${report.version}`,
      `Device: ${report.device}`,
      `Viewport: ${report.viewport}`,
      `When: ${new Date(report.createdAt).toISOString()}`,
    ].filter(Boolean);
    return `mailto:${MUM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };
  let href = hrefFor(note);
  while (href.length > MAILTO_LIMIT && note.length > 0) {
    note = note.slice(0, Math.max(0, note.length - 24)).trim();
    href = hrefFor(note);
  }
  return href.length > MAILTO_LIMIT ? hrefFor("") : href;
}
