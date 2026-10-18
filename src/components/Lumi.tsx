import type { Outfit } from "../lib/types";
import { Art } from "./Art";

export type LumiMood = "idle" | "happy" | "think" | "listen" | "cheer" | "sleep";

const POSE: Record<LumiMood, string> = {
  idle: "lumi/happy",
  happy: "lumi/happy",
  think: "lumi/think",
  listen: "lumi/listen",
  cheer: "lumi/cheer",
  sleep: "lumi/sleep",
};

export function Lumi({
  mood = "idle",
  className = "",
  wearing,
  eager = false,
}: {
  mood?: LumiMood;
  className?: string;
  wearing?: Outfit;
  eager?: boolean;
}) {
  const dress = mood !== "cheer" && mood !== "sleep";
  return (
    <div className={`lumi lumi-${mood} ${className}`} role="img" aria-label="Lumi the fox">
      {dress && wearing?.den ? <Art name={`dens/${wearing.den}-peek`} alt="" className="lumi-den" /> : null}
      <Art name={POSE[mood]} alt="" className="lumi-body" eager={eager} />
      {dress && wearing?.hat ? <Art name={`wear/${wearing.hat}`} alt="" className={`lumi-wear wear-${wearing.hat}`} /> : null}
      {dress && wearing?.scarf ? <Art name={`wear/${wearing.scarf}`} alt="" className={`lumi-wear wear-${wearing.scarf}`} /> : null}
      {dress && wearing?.glasses ? <Art name={`wear/${wearing.glasses}`} alt="" className={`lumi-wear wear-${wearing.glasses}`} /> : null}
    </div>
  );
}
