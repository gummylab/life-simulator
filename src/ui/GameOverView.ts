import { html, type TemplateResult } from "lit";
import type { GameState } from "../core/model/GameState";
import { WORLD } from "../content/world";
import { icon } from "./icons";
import { formatUsd } from "./format";

/**
 * The dynasty ends: no living descendant carries the line (Task 3.4).
 * Shows what the whole run accumulated — generations lived, people in
 * the tree, the final fortune — plus the two-tap restart, which is the
 * only way out from here.
 */
export class GameOverView {
  constructor(
    private readonly state: GameState,
    private readonly rateUsd: number,
    private readonly confirmPending = false,
  ) {}

  render(): TemplateResult {
    const dynasty = this.state.dynasty;
    const money = this.state.character.money;
    return html`
      <section class="panel summary">
        <h2>${icon("Skull", 18)}ตระกูลสิ้นสุดลง</h2>
        <p class="summary-note">
          ไม่มีทายาทคนใดเหลืออยู่ สายเลือดตระกูล${this.state.founderFamilyName} จบลงที่รุ่นนี้
        </p>
        <ul class="final-stats">
          <li class="final-stat">
            ${icon("Hourglass", 14)}<span>จำนวนรุ่นที่ผ่านไป</span
            ><span class="stat-value">${dynasty.generation}</span>
          </li>
          <li class="final-stat">
            ${icon("User", 14)}<span>คนในตระกูลทั้งหมด</span
            ><span class="stat-value">${dynasty.tree.length}</span>
          </li>
          <li class="final-stat">
            ${icon("Coins", 14)}<span>มรดกสุดท้าย</span
            ><span class="stat-value">${formatUsd(money * this.rateUsd)}</span>
          </li>
        </ul>
        <div class="summary-actions">
          <button
            type="button"
            class="advance ${this.confirmPending ? "confirm" : ""}"
            data-do="restart"
          >
            ${icon("RefreshCw", 18)}
            <span>${this.confirmPending ? "แตะอีกครั้งเพื่อยืนยัน" : "เริ่มตระกูลใหม่"}</span>
          </button>
          <button type="button" class="ghost" data-do="back">
            ${icon("ChevronLeft", 16)}ดูชีวประวัติ
          </button>
        </div>
        <p class="summary-note">
          มรดกที่ส่งต่อไม่ได้: ${money.toFixed(8)} ${WORLD.currency}
        </p>
      </section>
    `;
  }
}
