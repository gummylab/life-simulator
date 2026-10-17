import type { PlayerAction } from "../core/model/PlayerAction";
import type { ActionBlockReason } from "../core/Game";
import { escapeHtml } from "./format";

/** One action plus why it is blocked, or null when it can run. */
export interface MenuEntry {
  readonly action: PlayerAction;
  readonly reason: ActionBlockReason | null;
}

const REASON_LABELS: Record<ActionBlockReason, string> = {
  age: "ยังไม่ถึงวัยนี้",
  time: "เวลาไม่พอ",
  tired: "เหนื่อยเกินไป ต้องพักก่อน",
  money: "เงินไม่พอ",
};

/** Compact cost line shown under every action label. */
function costLine(action: PlayerAction): string {
  const parts = [`${action.timeCost} เวลา`];
  if (action.energyCost !== undefined && action.energyCost > 0) {
    parts.push(`-${action.energyCost} พลัง`);
  }
  if (action.energyRestore !== undefined) {
    parts.push(`+${action.energyRestore} พลัง`);
  }
  const money = action.effects.money;
  if (money !== undefined && money !== 0) {
    parts.push(`${money > 0 ? "+" : ""}${money} BTC`);
  }
  return parts.join(" · ");
}

/**
 * Action menu for the current year plus the button that ends it.
 * Blocked actions stay visible but disabled, each with the reason the
 * game engine reported, so the player learns why without guessing.
 */
export class MenuView {
  constructor(private readonly entries: readonly MenuEntry[]) {}

  render(): string {
    const buttons =
      this.entries.length === 0
        ? `<p class="muted">ยังไม่มีกิจกรรมที่ทำได้ในวัยนี้</p>`
        : this.entries
            .map(({ action, reason }) => {
              const blocked = reason !== null;
              return `
                <button type="button" class="action" data-do="${escapeHtml(action.id)}"${
                  blocked ? " disabled" : ""
                }>
                  <span class="action-label">${escapeHtml(action.label)}</span>
                  <span class="action-cost">${escapeHtml(costLine(action))}</span>
                  ${
                    blocked && reason !== null
                      ? `<span class="action-reason">${REASON_LABELS[reason]}</span>`
                      : ""
                  }
                </button>`;
            })
            .join("");

    return `
      <section class="panel">
        <h2>สิ่งที่ทำได้ในปีนี้</h2>
        <div class="actions">${buttons}</div>
        <button type="button" class="advance" data-do="advance">อายุ +1 ปี</button>
      </section>`;
  }
}
