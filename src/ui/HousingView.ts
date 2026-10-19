import { html, nothing, type TemplateResult } from "lit";
import type { Game } from "../core/Game";
import type { HomeSpec } from "../core/model/HomeSpec";
import type { HomeBlockReason } from "../core/systems/HouseholdSystem";
import { icon } from "./icons";
import { formatBtc, formatUsd } from "./money";

/** Why a home cannot be moved into, spelled out with the missing piece. */
function homeReasonLabel(reason: HomeBlockReason, home: HomeSpec): string {
  switch (reason) {
    case "age":
      return `ต้องอายุ ${home.minAge} ปี`;
    case "money":
      return "เงินดาวน์ยังไม่พอ";
  }
}

/** A price chip: USD check figure first, the BTC amount behind it. */
function priceChip(label: string, btc: number, rateUsd: number): TemplateResult {
  return html`<span class="chip chip-cost"
    >${label} ${formatUsd(btc * rateUsd)}
    <span class="muted">${formatBtc(btc)} BTC</span></span
  >`;
}

/**
 * The housing panel (ADR 0020): where the character lives, what it costs
 * every year, and what moving would cost. Collapsed it is one status row,
 * the same shape the jobs panel uses, so the first action card still fits
 * on a phone screen.
 */
export class HousingView {
  constructor(
    private readonly game: Game,
    private readonly rateUsd = 0,
  ) {}

  /** One-line summary for the life tab. */
  statusRow(): TemplateResult {
    const home = this.game.home;
    const label = home === null ? "อยู่กับครอบครัว" : home.label;
    const yearly = this.game.yearlyHousingCost;
    return html`
      <section class="panel status-row status-row-home">
        <button type="button" class="row-button" data-do="toggle-housing">
          <span class="action-icon">${icon("House", 16)}</span>
          <span class="action-label">${label}</span>
          <span class="muted">
            ${yearly > 0 ? `ปีละ ${formatUsd(yearly * this.rateUsd)}` : "ไม่มีค่าใช้จ่าย"}${icon(
              "ChevronRight",
              14,
            )}
          </span>
        </button>
      </section>
    `;
  }

  /** The full panel: every home in the catalog with its price and gate. */
  render(): TemplateResult {
    const content = this.game.gameContent;
    if (!content || content.homes.length === 0) {
      return html``;
    }
    const home = this.game.home;

    return html`
      <section class="panel">
        <h2>${icon("House", 18)}ที่อยู่</h2>
        <p class="muted summary-note">
          ${home === null
            ? "ตอนนี้อยู่กับครอบครัว ไม่มีค่าใช้จ่ายรายปี"
            : `${home.label} · ค่าใช้จ่ายปีละ ${formatUsd(home.yearlyCost * this.rateUsd)} (${formatBtc(
                home.yearlyCost,
              )} BTC)`}
        </p>
        <div class="rows">
          ${content.homes.map((entry) => this.homeRow(entry, home?.id ?? null))}
        </div>
        ${home === null
          ? nothing
          : html`<button type="button" class="ghost" data-do="home:family">
              ${icon("ChevronLeft", 16)}ย้ายกลับไปอยู่กับครอบครัว
            </button>`}
        <button type="button" class="ghost" data-do="toggle-housing">ซ่อน</button>
      </section>
    `;
  }

  /** One home card: label, prices, and the reason while it is out of reach. */
  private homeRow(home: HomeSpec, currentId: string | null): TemplateResult {
    const reason = this.game.homeBlockReason(home);
    const living = home.id === currentId;
    return html`
      <button
        type="button"
        class="action"
        data-do=${`home:${home.id}`}
        ?disabled=${reason !== null || living}
      >
        <span class="action-icon">${icon(living ? "House" : "ChevronRight", 16)}</span>
        <span class="action-body">
          <span class="action-label"
            >${home.label}
            ${living ? html`<span class="chip chip-new">อยู่ที่นี่</span>` : nothing}</span
          >
          <span class="action-meta">
            ${priceChip("เงินดาวน์", home.downPayment, this.rateUsd)}
            ${priceChip("ต่อปี", home.yearlyCost, this.rateUsd)}
          </span>
          ${reason !== null && !living
            ? html`<span class="action-reason">${homeReasonLabel(reason, home)}</span>`
            : nothing}
        </span>
      </button>
    `;
  }
}
