import type { DeathCause } from "../core/model/Character";

/** Thai labels for the death causes the engine can return. */
export const DEATH_CAUSE_LABELS: Record<DeathCause, string> = {
  oldAge: "ชราภาพตามวัย",
  illness: "ล้มป่วยหนัก",
  accident: "อุบัติเหตุไม่คาดคิด",
};
