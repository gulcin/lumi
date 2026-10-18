import { FEEDBACK_KEY, type FeedbackReport } from "./feedback";

type KeyStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const listeners = new Set<() => void>();
const EMPTY_REPORTS: FeedbackReport[] = [];
const snapshots = new WeakMap<KeyStore, { raw: string | null; reports: FeedbackReport[] }>();

export function feedbackUrl(): string {
  return String(import.meta.env.VITE_FEEDBACK_URL ?? "").replace(/\/$/, "");
}

export function readReports(store: KeyStore = localStorage): FeedbackReport[] {
  try {
    const raw = store.getItem(FEEDBACK_KEY);
    const cached = snapshots.get(store);
    if (cached && cached.raw === raw) return cached.reports;
    const parsed = JSON.parse(raw ?? "[]") as FeedbackReport[];
    const reports = Array.isArray(parsed) ? parsed : EMPTY_REPORTS;
    snapshots.set(store, { raw, reports });
    return reports;
  } catch {
    return EMPTY_REPORTS;
  }
}

export function writeReports(store: KeyStore, reports: FeedbackReport[]): void {
  store.setItem(FEEDBACK_KEY, JSON.stringify(reports.slice(0, 40)));
  listeners.forEach((listener) => listener());
}

export function rememberReport(store: KeyStore, report: FeedbackReport): void {
  writeReports(store, [report, ...readReports(store).filter((item) => item.id !== report.id)]);
}

export function markReportSent(store: KeyStore, id: string, sentAt: number): void {
  writeReports(
    store,
    readReports(store).map((report) => (report.id === id ? { ...report, sentAt } : report)),
  );
}

export function subscribeReports(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function postReport(report: FeedbackReport): Promise<"sent" | "queued"> {
  const url = feedbackUrl();
  if (!url) return "queued";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(4000),
    });
    return response.ok ? "sent" : "queued";
  } catch {
    return "queued";
  }
}

export async function flushReports(store: KeyStore = localStorage): Promise<void> {
  if (!feedbackUrl()) return;
  for (const report of readReports(store)) {
    if (report.sentAt) continue;
    const status = await postReport(report);
    if (status !== "sent") return;
    markReportSent(store, report.id, Date.now());
  }
}
