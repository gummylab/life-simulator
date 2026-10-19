import type { IconName } from "./icons";

/**
 * The action menu is long from the teenage years on, so the cards are
 * grouped by what the player is trying to do. The grouping lives here
 * instead of on PlayerAction so the game core stays free of UI concerns,
 * exactly like ACTION_ICONS does for icons.
 */
export interface ActionGroup {
  readonly id: string;
  readonly label: string;
  readonly iconName: IconName;
}

/** Display order of the blocks; runnable blocks float above this order. */
export const ACTION_GROUPS: readonly ActionGroup[] = [
  { id: "selfcare", label: "ดูแลตัวเอง", iconName: "Leaf" },
  { id: "growth", label: "เรียนรู้และเล่น", iconName: "BookOpenText" },
  { id: "work", label: "งานและรายได้", iconName: "Wallet" },
  { id: "love", label: "ความสัมพันธ์", iconName: "HeartHandshake" },
];

/** Block each action belongs to; ids are checked against ACTIONS by test. */
export const ACTION_GROUP_OF: Readonly<Record<string, string>> = {
  rest: "selfcare",
  sleep: "selfcare",
  "cafe-movie": "selfcare",
  massage: "selfcare",
  trip: "selfcare",
  exercise: "selfcare",
  toys: "growth",
  story: "growth",
  study: "growth",
  "enroll-university": "growth",
  "part-time": "work",
  freelance: "work",
  date: "love",
  marry: "love",
  divorce: "love",
  "have-child": "love",
};

/** Group an action id belongs to; unknown ids fall back to the first block. */
export function groupIdFor(actionId: string): string {
  return ACTION_GROUP_OF[actionId] ?? ACTION_GROUPS[0]?.id ?? "selfcare";
}

/** The group record for an id, with a safe fallback for unknown content. */
export function groupFor(actionId: string): ActionGroup {
  const id = groupIdFor(actionId);
  return (
    ACTION_GROUPS.find((group) => group.id === id) ??
    (ACTION_GROUPS[0] as ActionGroup)
  );
}
