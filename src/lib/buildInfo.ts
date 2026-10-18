export const buildInfo = {
  version: __LUMI_VERSION__,
  sha: __LUMI_SHA__,
  date: __LUMI_DATE__,
};

export function versionLabel(info: { version: string; sha: string; date: string } = buildInfo): string {
  return `v${info.version} · ${info.sha} · ${info.date}`;
}
