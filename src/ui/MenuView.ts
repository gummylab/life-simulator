import { html, nothing, type TemplateResult } from "lit";
import type { PlayerAction } from "../core/model/PlayerAction";
import type { ActionBlockReason } from "../core/Game";
import { actionIcon, icon } from "./icons";
import { formatUsd } from "./format";

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
  partner: "ยังไม่มีคนรัก",
  taken: "มีคนรักอยู่แล้ว",
  spouse: "ต้องแต่งงานก่อน",
  done: "ทำไปแล้ว",
};

/** Cost and payout chips shown on every action card. */
function costChips(action: PlayerAction, rateUsd: number): TemplateResult[] {
  const chips: TemplateResult[] = [
    html`<span class="chip">${action.timeCost} เวลา</span>`,
  ];
  if (action.energyCost !== undefined && action.energyCost > 0) {
    chips.push(html`<span class="chip chip-cost">-${action.energyCost} พลัง</span>`);
  }
  if (action.energyRestore !== undefined) {
    chips.push(html`<span class="chip chip-gain">+${action.energyRestore} พลัง</span>`);
  }
  const money = action.effects.money;
  if (money !== undefined && money !== 0) {
    // BTC leads with a USD check figure, the same order the HUD uses.
    const fiat = formatUsd(Math.abs(money) * rateUsd);
    chips.push(
      html`<span class="chip ${money > 0 ? "chip-gain" : "chip-cost"}"
        >${money > 0 ? "+" : "-"}${Math.abs(money)} BTC <span class="muted">≈ ${fiat}</span></span
      >`,
    );
  }
  return chips;
}

/**
 * Action menu for the current year. Blocked actions stay visible but
 * disabled, each with the reason the engine reported, so the player
 * learns why without guessing. Runnable actions sort to the top so the
 * next tap is always the first card. The button that ends the year lives
 * in the bottom dock instead (App).
 */
export class MenuView {
  constructor(
    private readonly entries: readonly MenuEntry[],
    private readonly rateUsd = 0,
  ) {}

  render(): TemplateResult {
    // Runnable first, blocked below; stable within each group so the
    // menu does not reshuffle unrelated cards when one becomes blocked.
    const sorted = [...this.entries].sort(
      (a, b) => Number(a.reason !== null) - Number(b.reason !== null),
    );
    const buttons =
      sorted.length === 0
        ? html`<p class="muted">ยังไม่มีกิจกรรมที่ทำได้ในวัยนี้</p>`
        : sorted.map(
            ({ action, reason }) => html`
              <button
                type="button"
                class="action"
                data-do=${action.id}
                ?disabled=${reason !== null}
              >
                <span class="action-icon">${actionIcon(action.id)}</span>
                <span class="action-main">
                  <span class="action-label">${action.label}</span>
                  <span class="action-cost">${costChips(action, this.rateUsd)}</span>
                </span>
                ${reason !== null
                  ? html`<span class="action-reason">${REASON_LABELS[reason]}</span>`
                  : nothing}
              </button>
            `,
          );

    return html`
      <section class="panel">
        <h2>${icon("ListChecks", 18)}สิ่งที่ทำได้ในปีนี้</h2>
        <div class="actions">${buttons}</div>
      </section>
    `;
  }
}
