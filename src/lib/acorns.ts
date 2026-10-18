import type { AcornEvent, Outfit, Progress } from "./types";

export type ShopSlot = keyof Outfit;

export type ShopItem = {
  id: string;
  slot: ShopSlot;
  name: string;
  cost: number;
  emoji: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: "hat-cap", slot: "hat", name: "Explorer cap", cost: 4, emoji: "🧢" },
  { id: "hat-leaf", slot: "hat", name: "Leaf crown", cost: 5, emoji: "🍃" },
  { id: "hat-star", slot: "hat", name: "Star hat", cost: 6, emoji: "⭐" },
  { id: "scarf-teal", slot: "scarf", name: "Teal scarf", cost: 4, emoji: "🧣" },
  { id: "scarf-gold", slot: "scarf", name: "Gold scarf", cost: 5, emoji: "✨" },
  { id: "glasses-round", slot: "glasses", name: "Round glasses", cost: 4, emoji: "👓" },
  { id: "glasses-star", slot: "glasses", name: "Star glasses", cost: 6, emoji: "🌟" },
  { id: "den-stars", slot: "den", name: "Starry den", cost: 6, emoji: "🌌" },
  { id: "den-leaves", slot: "den", name: "Leafy den", cost: 6, emoji: "🌳" },
];

const RAPID_MS = 1500;

export function acornBalance(progress: Progress): number {
  const sum = progress.acornEvents.reduce((total, event) => total + event.delta, 0);
  return Math.max(0, sum);
}

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

function pushEvent(progress: Progress, event: AcornEvent): Progress {
  return { ...progress, acornEvents: [...progress.acornEvents, event].slice(-500), lastAcornAt: event.at };
}

export function earnAcorn(progress: Progress, at: number, reason: string, amount = 1): { progress: Progress; earned: boolean } {
  if (amount <= 0) return { progress, earned: false };
  if (reason === "hands-on" && progress.lastAcornAt != null && at - progress.lastAcornAt < RAPID_MS) {
    return { progress, earned: false };
  }
  const id = `a_${at}_${reason}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  return { progress: pushEvent(progress, { id, at, delta: amount, reason }), earned: true };
}

export function buyItem(progress: Progress, itemId: string, at: number): Progress | null {
  const item = shopItem(itemId);
  if (!item) return null;
  if (progress.owned.includes(itemId)) {
    return { ...progress, wearing: { ...progress.wearing, [item.slot]: itemId } };
  }
  if (acornBalance(progress) < item.cost) return null;
  const id = `s_${at}_${itemId}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const next = pushEvent(progress, { id, at, delta: -item.cost, reason: `buy:${itemId}` });
  return {
    ...next,
    owned: [...next.owned, itemId],
    wearing: { ...next.wearing, [item.slot]: itemId },
  };
}
