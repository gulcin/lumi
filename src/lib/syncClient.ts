import { normalizeFamilyCode } from "./familyCode";
import { normalizeProgress } from "./progress";
import { mergeProgress } from "./syncMerge";
import type { Progress } from "./types";

export const SYNC_META_KEY = "lumi.sync.meta";

export type SyncMeta = {
  familyCode?: string;
  dirty?: boolean;
  lastError?: string;
  lastSyncedAt?: number;
  status?: string;
};

export function syncConfigured(): boolean {
  return Boolean(import.meta.env.VITE_LUMI_API_URL);
}

export function apiBase(): string {
  return String(import.meta.env.VITE_LUMI_API_URL ?? "").replace(/\/$/, "");
}

export function loadSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SyncMeta;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

type FamilyChild = { childKey: string; nickname: string };

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  return response;
}

export async function createFamily(): Promise<string> {
  const response = await request("/v1/families", { method: "POST", body: "{}" });
  if (!response.ok) throw new Error("The family book could not start a code.");
  const body = (await response.json()) as { code?: string };
  if (!body.code) throw new Error("The family book did not return a code.");
  const code = normalizeFamilyCode(body.code);
  saveSyncMeta({ ...loadSyncMeta(), familyCode: code, dirty: true, lastError: undefined, status: "Code saved on this device." });
  return code;
}

export async function lookupFamily(code: string): Promise<FamilyChild[]> {
  const response = await request(`/v1/family?code=${encodeURIComponent(code)}`);
  if (response.status === 404) throw new Error("That family code was not found.");
  if (!response.ok) throw new Error("The family book did not answer.");
  const body = (await response.json()) as { children?: FamilyChild[] };
  return body.children ?? [];
}

export async function pushProgress(progress: Progress, code: string): Promise<Progress> {
  const response = await request("/v1/progress", {
    method: "POST",
    body: JSON.stringify({
      code,
      childKey: progress.childKey,
      nickname: progress.childName.slice(0, 24),
      progress,
    }),
  });
  if (response.status === 404) throw new Error("That family code was not found.");
  if (!response.ok) throw new Error("Progress could not sync.");
  const body = (await response.json()) as { progress?: unknown };
  const remote = normalizeProgress(body.progress);
  return mergeProgress(progress, remote);
}

export async function fetchChat(code: string, childKey: string): Promise<{ role: string; content: string; createdAt: string }[]> {
  const response = await request(`/v1/chat?code=${encodeURIComponent(code)}&childKey=${encodeURIComponent(childKey)}`);
  if (!response.ok) return [];
  const body = (await response.json()) as { messages?: { role: string; content: string; createdAt: string }[] };
  return body.messages ?? [];
}

export async function sendChat(code: string, childKey: string, message: string, topicHint?: string): Promise<string> {
  const response = await request("/v1/chat", {
    method: "POST",
    body: JSON.stringify({ code, childKey, message, topicHint }),
  });
  const body = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (response.status === 429) throw new Error("Lumi needs a short rest. Try again a little later.");
  if (!response.ok) throw new Error(body.error || "Lumi could not answer just now.");
  return body.reply || "I am still thinking. Ask me again in a moment.";
}

export async function polishNote(code: string, text: string): Promise<string> {
  const response = await request("/v1/polish", {
    method: "POST",
    body: JSON.stringify({ code, text }),
  });
  if (!response.ok) return text;
  const body = (await response.json()) as { text?: string };
  return body.text || text;
}

export function joinUrl(code: string): string {
  return `https://gulcin.github.io/lumi/#sync=${encodeURIComponent(code)}`;
}
