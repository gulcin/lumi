import { useEffect, useSyncExternalStore } from "react";
import { subscribeUpdates, currentUpdatePlan, noteUpdatePlan, applyUpdate } from "../lib/swUpdates";
import { subscribeLesson } from "../lib/updateState";
import { Lumi } from "./Lumi";

function subscribe(listener: () => void): () => void {
  const stopUpdates = subscribeUpdates(listener);
  const stopLesson = subscribeLesson(listener);
  return () => {
    stopUpdates();
    stopLesson();
  };
}

export function UpdateBanner() {
  const plan = useSyncExternalStore(subscribe, currentUpdatePlan, () => "idle" as const);
  useEffect(() => {
    noteUpdatePlan(plan);
    document.documentElement.classList.toggle("update-waiting", plan === "banner");
    return () => document.documentElement.classList.remove("update-waiting");
  }, [plan]);
  if (plan !== "banner") return null;
  return (
    <aside className="update-banner" data-testid="update-banner" role="status">
      <Lumi mood="happy" eager className="lumi-banner" />
      <p>Lumi learned something new!</p>
      <button type="button" className="primary" data-testid="update-apply" onClick={applyUpdate}>
        Update
      </button>
    </aside>
  );
}
