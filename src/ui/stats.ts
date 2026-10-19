import type { StatKey } from "../core/model/StatBlock";

/** Thai label per life stat, shared by the HUD and the death summary. */
export const STAT_LABELS: Readonly<Record<StatKey, string>> = {
  health: "สุขภาพ",
  happiness: "ความสุข",
  smarts: "ปัญญา",
  looks: "รูปลักษณ์",
};

/** Bar tone by value: danger below 30, amber below 60, calm above. */
export function statTone(value: number): "low" | "mid" | "" {
  if (value < 30) return "low";
  if (value < 60) return "mid";
  return "";
}
