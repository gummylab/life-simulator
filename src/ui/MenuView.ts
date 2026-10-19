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
 * Action menu for the current year (Phase 5 layout). Runnable cards come
 * first so the next tap is always the top card. Age-blocked cards stay
 * visible below them: they are the showFrom promise that lets the player
 * see a coming decision early. Every other block (time, tired, money,
 * relationship gates) collapses behind a disclosure, mirroring the jobs
 * panel. A "ใหม่" badge marks cards the player has not been offered
 * before; it clears once the year ends and seenActions catches up.
 */
export class MenuView {
  constructor(
    private readonly entries: readonly MenuEntry[],
    private readonly rateUsd = 0,
    private readonly seen: ReadonlySet<string> = new Set(),
    private readonly showBlocked = false,
  ) {}

  render(): TemplateResult {
    // Stable within each group so the menu never reshuffles unrelated
    // cards when one becomes blocked.
    const runnable = this.entries.filter(({ reason }) => reason === null);
    const ageBlocked = this.entries.filter(({ reason }) => reason === "age");
    const otherBlocked = this.entries.filter(
      ({ reason }) => reason !== null && reason !== "age",
    );

    if (this.entries.length === 0) {
      return html`
        <section class="panel">
          <h2>${icon("ListChecks", 18)}สิ่งที่ทำได้ในปีนี้</h2>
          <p class="muted">ยังไม่มีกิจกรรมที่ทำได้ในวัยนี้</p>
        </section>
      `;
    }

    return html`
      <section class="panel">
        <h2>${icon("ListChecks", 18)}สิ่งที่ทำได้ในปีนี้</h2>
        <div class="actions">
          ${runnable.map(({ action }) => this.actionCard(action, null))}
          ${ageBlocked.map(({ action }) => this.actionCard(action, "age"))}
          ${this.showBlocked
            ? otherBlocked.map(({ action, reason }) => this.actionCard(action, reason))
            : nothing}
        </div>
        ${otherBlocked.length > 0
          ? html`<button type="button" class="ghost" data-do="toggle-blocked">
              ${this.showBlocked
                ? "ซ่อนรายการที่ยังทำไม่ได้"
                : `ยังทำไม่ได้ (${otherBlocked.length})`}
            </button>`
          : nothing}
      </section>
    `;
  }

  /** One action card; the reason span appears only while blocked. */
  private actionCard(action: PlayerAction, reason: ActionBlockReason | null): TemplateResult {
    return html`
      <button
        type="button"
        class="action"
        data-do=${action.id}
        ?disabled=${reason !== null}
      >
        <span class="action-icon">${actionIcon(action.id)}</span>
        <span class="action-main">
          <span class="action-label"
            >${action.label}
            ${!this.seen.has(action.id) ? html`<span class="chip chip-new">ใหม่</span>` : nothing}
          </span>
          <span class="action-cost">${costChips(action, this.rateUsd)}</span>
        </span>
        ${reason !== null
          ? html`<span class="action-reason">${REASON_LABELS[reason]}</span>`
          : nothing}
      </button>
    `;
  }
}
