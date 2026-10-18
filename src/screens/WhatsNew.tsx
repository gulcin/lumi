import changelog from "../../CHANGELOG.md?raw";
import { buildInfo, versionLabel } from "../lib/buildInfo";
import { parseChangelog } from "../lib/version";

export function WhatsNew() {
  const notes = parseChangelog(changelog);
  return (
    <section data-testid="whats-new" className="release-notes">
      <h1>What's new</h1>
      <p className="lede">What changed in Lumi, in the order it arrived.</p>
      {notes.map((release) => (
        <article key={release.version}>
          <h2>
            Version {release.version}
            {release.date ? <small> · {release.date}</small> : null}
          </h2>
          {release.intro.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {release.sections.map((section) => (
            <div key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </article>
      ))}
      <p className="tiny muted">This copy is {versionLabel(buildInfo)}.</p>
    </section>
  );
}
