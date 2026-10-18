export const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const SEEN_VERSION_KEY = "lumi.seenVersion";
export const PROGRESS_KEY = "lumi.progress.v1";

/** Short line for the child when this version is newer than the one she last opened. */
const KID_NOTES: Record<string, string> = {
  "1.0.0": "Lumi has new pictures.",
  "1.1.0": "Your lessons stayed right where you left them.",
  "1.1.1": "You can see Lumi on your home screen.",
  "1.1.2": "The words are the right size.",
};

export type ReleaseSection = { title: string; items: string[] };

export type ReleaseNotes = {
  version: string;
  date: string;
  intro: string[];
  sections: ReleaseSection[];
};

export type KeyStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function serviceWorkerCacheId(version: string): string {
  if (!SEMVER.test(version)) throw new Error(`Lumi version must be semver, got ${version}`);
  return `lumi-v${version}`;
}

export function kidNoteFor(version: string): string {
  return KID_NOTES[version] ?? "Lumi has something new.";
}

export function parseChangelog(markdown: string): ReleaseNotes[] {
  const releases: ReleaseNotes[] = [];
  let current: ReleaseNotes | null = null;
  let section: ReleaseSection | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const release = /^## \[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*$/.exec(line);
    if (release) {
      section = null;
      if (release[1] === "Unreleased") {
        current = null;
        continue;
      }
      current = { version: release[1], date: release[2] ?? "", intro: [], sections: [] };
      releases.push(current);
      continue;
    }
    if (!current || !line || line.startsWith("<!--") || line.startsWith("[")) continue;
    const heading = /^###\s+(.+)$/.exec(line);
    if (heading) {
      section = { title: heading[1].trim(), items: [] };
      current.sections.push(section);
      continue;
    }
    const item = /^-\s+(.+)$/.exec(line);
    if (item && section) {
      section.items.push(item[1].trim());
      continue;
    }
    if (!section) current.intro.push(line);
  }
  return releases;
}

/** True when a child who already uses Lumi should see the New! note. A first launch records the version quietly. */
export function openKidNotice(store: KeyStore, version: string): boolean {
  const seen = store.getItem(SEEN_VERSION_KEY);
  if (seen === version) return false;
  if (!seen && store.getItem(PROGRESS_KEY) === null) {
    store.setItem(SEEN_VERSION_KEY, version);
    return false;
  }
  return true;
}

export function dismissKidNotice(store: KeyStore, version: string): void {
  store.setItem(SEEN_VERSION_KEY, version);
}
