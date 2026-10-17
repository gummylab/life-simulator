import { html, nothing, type TemplateResult } from "lit";
import type { PlayerAction } from "../core/model/PlayerAction";
import type { ActionBlockReason } from "../core/Game";
import { actionIcon, icon } from "./icons";

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
function costChips(action: PlayerAction): TemplateResult[] {
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
    chips.push(
      html`<span class="chip ${money > 0 ? "chip-gain" : "chip-cost"}"
        >${money > 0 ? "+" : ""}${money} BTC</span
      >`,
    );
  }
  return chips;
}

/**
 * Action menu for the current year. Blocked actions stay visible but
 * disabled, each with the reason the engine reported, so the player
 * learns why without guessing. The button that ends the year lives in
 * the bottom dock instead (App).
 */
export class MenuView {
  constructor(private readonly entries: readonly MenuEntry[]) {}

  render(): TemplateResult {
    const buttons =
      this.entries.length === 0
        ? html`<p class="muted">ยังไม่มีกิจกรรมที่ทำได้ในวัยนี้</p>`
        : this.entries.map(
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
                  <span class="action-cost">${costChips(action)}</span>
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
