import { Workbox } from "workbox-window";
import { buildInfo } from "./buildInfo";
import { isLessonInProgress, subscribeLesson } from "./updateState";
import { CHECK_INTERVAL_MS, planUpdate, UPDATE_DEFERRED_KEY, type UpdatePlan } from "./updates";

type RemoteVersion = { version: string; sha?: string; date?: string };

let registration: ServiceWorkerRegistration | undefined;
let skipWaiting: (() => void) | undefined;
let waiting = false;
let applying = false;
let started = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function deferredFlags(): { deferred: boolean; deferredThisSession: boolean } {
  return {
    deferred: localStorage.getItem(UPDATE_DEFERRED_KEY) === "1",
    deferredThisSession: sessionStorage.getItem(UPDATE_DEFERRED_KEY) === "1",
  };
}

export function currentUpdatePlan(): UpdatePlan {
  const flags = deferredFlags();
  return planUpdate({
    waiting,
    lesson: isLessonInProgress(),
    deferred: flags.deferred,
    deferredThisSession: flags.deferredThisSession,
    applying,
  });
}

export function subscribeUpdates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function markDeferred(): void {
  localStorage.setItem(UPDATE_DEFERRED_KEY, "1");
  sessionStorage.setItem(UPDATE_DEFERRED_KEY, "1");
  emit();
}

function clearDeferred(): void {
  localStorage.removeItem(UPDATE_DEFERRED_KEY);
  sessionStorage.removeItem(UPDATE_DEFERRED_KEY);
  emit();
}

export function noteUpdatePlan(plan: UpdatePlan): void {
  if (plan === "defer") markDeferred();
  if (plan === "apply") applyUpdate();
}

export function applyUpdate(): void {
  if (applying) return;
  applying = true;
  clearDeferred();
  emit();
  skipWaiting?.();
}

export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as RemoteVersion;
    if (!data || typeof data.version !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export async function checkForUpdates(): Promise<string> {
  const remote = await fetchRemoteVersion();
  try {
    if (registration) await registration.update();
  } catch {
    return "Couldn't look just now. Try again in a little while.";
  }
  if (registration?.waiting || registration?.installing || waiting) {
    return "Lumi learned something new!";
  }
  if (remote && remote.version !== buildInfo.version) return "A new Lumi is on the way.";
  if (remote && remote.version === buildInfo.version) clearDeferred();
  if (!registration) return "Updates arrive once Lumi is on the home screen.";
  return "Lumi is up to date.";
}

export function startUpdateChecks(): void {
  if (started || !("serviceWorker" in navigator)) return;
  started = true;
  const worker = new Workbox(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL,
    updateViaCache: "none",
  });
  skipWaiting = () => worker.messageSkipWaiting();
  worker.addEventListener("controlling", (event) => {
    // The first install also takes control. Reload only for a real update,
    // including the first session, where Workbox still reports isUpdate as false.
    if (event.isUpdate || applying) window.location.reload();
  });
  worker.addEventListener("waiting", () => {
    waiting = true;
    emit();
  });
  subscribeLesson(() => emit());
  void worker.register({ immediate: true }).then((reg) => {
    registration = reg;
    document.documentElement.dataset.updates = "1";
    const look = () => {
      void checkForUpdates();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") look();
    });
    window.setInterval(look, CHECK_INTERVAL_MS);
    look();
  });
}
