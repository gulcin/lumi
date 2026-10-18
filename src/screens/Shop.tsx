import { useEffect } from "react";
import { Shell, TopBar } from "../components/Chrome";
import { Lumi } from "../components/Lumi";
import { acornBalance, buyItem, SHOP_ITEMS } from "../lib/acorns";
import { speak } from "../lib/speech";
import type { Progress } from "../lib/types";

export function ShopScreen({
  progress,
  speechOn,
  onBack,
  onProgress,
}: {
  progress: Progress;
  speechOn: boolean;
  onBack: () => void;
  onProgress: (progress: Progress) => void;
}) {
  const balance = acornBalance(progress);
  const line = `You have ${balance} acorns. Spend them to dress Lumi.`;
  useEffect(() => {
    if (speechOn) speak(line);
  }, [speechOn, line]);
  return (
    <Shell>
      <TopBar title="Acorn shop" onBack={onBack} speechOn={speechOn} onReplay={() => speak(line)} />
      <Lumi mood="happy" wearing={progress.wearing} />
      <h1 data-testid="acorn-shop">{balance} acorns</h1>
      <p className="lede">Acorns come from careful answers, reflections, and star skills. Quick tapping does not grow them.</p>
      <div className="shop-grid">
        {SHOP_ITEMS.map((item) => {
          const owned = progress.owned.includes(item.id);
          const worn = progress.wearing[item.slot] === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className="card"
              onClick={() => {
                const next = buyItem(progress, item.id, Date.now());
                if (next) onProgress(next);
                if (speechOn) speak(owned ? `Wearing ${item.name}.` : item.name);
              }}
            >
              <strong>
                {item.emoji} {item.name}
              </strong>
              <p className="tiny muted">{owned ? (worn ? "Wearing" : "Wear") : `${item.cost} acorns`}</p>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}
