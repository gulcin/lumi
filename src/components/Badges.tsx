import { Art } from "./Art";
import { LEARNER_TRAITS } from "../lib/pyp";
import type { Progress } from "../lib/types";

export function BadgeRow({ progress }: { progress: Progress }) {
  return (
    <div className="badges" data-testid="learner-badges" aria-label="Learner profile">
      {LEARNER_TRAITS.map((trait) => {
        const count = progress.badges[trait.id]?.count ?? 0;
        return (
          <span key={trait.id} className={count > 0 ? "badge on" : "badge"} title={trait.hint}>
            {count > 0 ? <Art name="spots/acorn" alt="" className="badge-art" /> : null}
            {trait.name}
            {count > 0 ? ` ${count}` : ""}
          </span>
        );
      })}
    </div>
  );
}
