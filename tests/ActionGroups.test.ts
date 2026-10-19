import { describe, expect, test } from "bun:test";
import { ACTIONS } from "../src/content/actions";
import { ACTION_GROUPS, ACTION_GROUP_OF, groupFor } from "../src/ui/actionGroups";

/**
 * The action menu is grouped in the UI layer, so a new action in the
 * content library could silently land in the wrong block. These tests keep
 * the map complete and the ids honest.
 */
describe("action groups", () => {
  test("every action in the content library has a group", () => {
    const missing = ACTIONS.filter((action) => !(action.id in ACTION_GROUP_OF)).map(
      (action) => action.id,
    );
    expect(missing).toEqual([]);
  });

  test("every group id points at a declared group", () => {
    const known = new Set(ACTION_GROUPS.map((group) => group.id));
    const unknown = Object.values(ACTION_GROUP_OF).filter((id) => !known.has(id));
    expect(unknown).toEqual([]);
  });

  test("an unknown action falls back to the first group instead of crashing", () => {
    // "selfcare" is the first declared block, the documented fallback.
    expect(groupFor("no-such-action").id).toBe("selfcare");
  });
});
