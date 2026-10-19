import type { HomeSpec } from "../core/model/HomeSpec";
import { HOUSING } from "../core/config";

/**
 * The housing catalog (ADR 0020).
 *
 * Three places to live, all invented like the rest of the world. Living
 * with the family is not in this list: it is what a character does before
 * they ever move out, and it costs nothing. Prices live in core/config.ts
 * with the rest of the balance numbers, read here the way jobs.ts reads
 * SALARY.
 *
 * The comfort a home gives is applied every year, so the yearly cost buys
 * something the player can feel in the stats.
 */
export const HOMES: readonly HomeSpec[] = [
  {
    id: "rent-room",
    label: "ห้องเช่าเล็ก",
    minAge: 18,
    downPayment: HOUSING["rent-room"]?.down ?? 0,
    yearlyCost: HOUSING["rent-room"]?.yearly ?? 0,
    effects: { stats: { happiness: 2 } },
  },
  {
    id: "rent-house",
    label: "บ้านเช่า",
    minAge: 18,
    downPayment: HOUSING["rent-house"]?.down ?? 0,
    yearlyCost: HOUSING["rent-house"]?.yearly ?? 0,
    effects: { stats: { happiness: 4, health: 1 } },
  },
  {
    id: "own-house",
    label: "บ้านของตัวเอง",
    minAge: 18,
    downPayment: HOUSING["own-house"]?.down ?? 0,
    yearlyCost: HOUSING["own-house"]?.yearly ?? 0,
    effects: { stats: { happiness: 6, health: 2 } },
  },
];
