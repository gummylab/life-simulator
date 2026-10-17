import { describe, expect, test } from "bun:test";
import type { TimelineEntry } from "../src/core/model/GameState";
import { groupTimelineEntries } from "../src/ui/TimelineView";

function entry(year: number, age: number, text: string): TimelineEntry {
  return { year, age, text };
}

describe("groupTimelineEntries", () => {
  test("repeats of the same action in one year merge into one line", () => {
    const groups = groupTimelineEntries([
      entry(2026, 0, "นอนดูซีรีส์"),
      entry(2026, 0, "นอนดูซีรีส์"),
      entry(2026, 0, "นอนดูซีรีส์"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.count).toBe(3);
    expect(groups[0]?.text).toBe("นอนดูซีรีส์");
  });

  test("the same action in different years stays on separate lines", () => {
    const groups = groupTimelineEntries([
      entry(2027, 1, "นอนดูซีรีส์"),
      entry(2026, 0, "นอนดูซีรีส์"),
    ]);
    expect(groups).toHaveLength(2);
  });

  test("different actions in the same year stay on separate lines", () => {
    const groups = groupTimelineEntries([
      entry(2026, 0, "ฟังนิทาน"),
      entry(2026, 0, "นอนดูซีรีส์"),
      entry(2026, 0, "ฟังนิทาน"),
    ]);
    expect(groups).toHaveLength(3);
  });

  test("the given order is kept and single runs count as one", () => {
    const groups = groupTimelineEntries([
      entry(2026, 0, "ก"),
      entry(2025, 0, "ข"),
    ]);
    expect(groups.map((group) => group.text)).toEqual(["ก", "ข"]);
    expect(groups[0]?.count).toBe(1);
  });
});
