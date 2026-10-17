import type { StatKey } from "../core/model/StatBlock";

/** Thai label per life stat, shared by the HUD and the death summary. */
export const STAT_LABELS: Readonly<Record<StatKey, string>> = {
  health: "สุขภาพ",
  happiness: "ความสุข",
  smarts: "ปัญญา",
  looks: "รูปลักษณ์",
};
