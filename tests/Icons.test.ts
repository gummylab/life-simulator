import { describe, expect, test } from "bun:test";
import { ACTIONS } from "../src/content/actions";
import { STAT_KEYS } from "../src/core/model/StatBlock";
import {
  ACTION_ICONS,
  ICON_SET,
  STAT_ICONS,
  iconForAction,
  iconMarkup,
} from "../src/ui/icons";

/**
 * The icon layer is content-driven, so a typo or a new action without an
 * icon would silently degrade to a plain circle. These tests keep the map
 * honest: every action and stat must resolve to a real lucide icon.
 */
describe("icons", () => {
  test("every action in the content library has a mapped icon", () => {
    const missing = ACTIONS.filter((action) => !(action.id in ACTION_ICONS)).map(
      (action) => action.id,
    );
    expect(missing).toEqual([]);
  });

  test("every mapped icon name exists in the registry", () => {
    const names = new Set(Object.keys(ICON_SET));
    const unknown = Object.values(ACTION_ICONS).filter((name) => !names.has(name));
    expect(unknown).toEqual([]);
  });

  test("every life stat has a mapped icon", () => {
    for (const key of STAT_KEYS) {
      expect(Object.keys(ICON_SET)).toContain(STAT_ICONS[key]);
    }
  });

  test("an unknown action falls back to a circle instead of crashing", () => {
    expect(iconForAction("no-such-action")).toBe("Circle");
    expect(iconMarkup(iconForAction("no-such-action"))).toContain("<svg");
  });

  test("icon markup is a standalone svg element with a viewBox", () => {
    const markup = iconMarkup("Heart", 20);
    expect(markup).toContain("<svg");
    expect(markup).toContain('viewBox="0 0 24 24"');
    expect(markup).toContain('width="20"');
    expect(markup).toContain('stroke="currentColor"');
    // The heart icon is drawn with a path, so real geometry came through.
    expect(markup).toContain("<path");
    expect(markup).toContain("</svg>");
  });
});
