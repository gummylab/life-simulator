import { html, nothing, type TemplateResult } from "lit";
import type { SuccessionPlan } from "../core/systems/SuccessionSystem";
import { WORLD } from "../content/world";
import { icon } from "./icons";
import { formatUsd } from "./format";

/**
 * The hand-off screen between two lives (Task 3.4):
 * - with a plan (the character just died with heirs) it shows the
 *   chronicle of the crossed generations, who the next life will be,
 *   and the rebirth button,
 * - without a plan (opened from the more tab) it is a read-only look
 *   at the family record with only a way back.
 * The plan comes from App and is derived from the frozen post-death
 * save, so a refresh lands on the same heir and the same lines.
 */
export class SuccessionView {
  constructor(
    private readonly lines: readonly string[],
    private readonly plan: SuccessionPlan | null,
    private readonly rateUsd: number,
    /** Years between the death and the heir's birth, for the jump note. */
    private readonly jumpYears: number,
  ) {}

  render(): TemplateResult {
    const plan = this.plan;
    return html`
      <section class="panel summary">
        <h2>${icon("ScrollText", 18)}บันทึกตระกูล</h2>
        ${this.lines.length > 0
          ? html`<ul class="chronicle">
              ${this.lines.map((line) => html`<li>${line}</li>`)}
            </ul>`
          : html`<p class="summary-note">ยังไม่มีเรื่องราวข้ามรุ่น</p>`}
        ${plan ? this.heirBlock(plan) : nothing}
        <div class="summary-actions">
          ${plan
            ? html`<button type="button" class="advance" data-do="rebirth">
                ${icon("Baby", 18)}<span>เกิดใหม่เป็น ${plan.heir.givenName}</span>
              </button>`
            : nothing}
          <button type="button" class="ghost" data-do="back">
            ${icon("ChevronLeft", 16)}กลับ
          </button>
        </div>
      </section>
    `;
  }

  /** Who the next life is and what they inherit, once the jump is done. */
  private heirBlock(plan: SuccessionPlan): TemplateResult {
    const heir = plan.heir;
    const fiat = formatUsd(plan.legacyMoney * this.rateUsd);
    return html`
      <div class="heir-card">
        <p>
          ข้ามเวลาไป ${this.jumpYears} ปีต่อมา ทายาท
          <strong> ${heir.givenName} ${heir.familyName}</strong> (เกิดปี ${heir.birthYear})
          จะสืบทอดตระกูลในรุ่นที่ ${plan.newGeneration}
        </p>
        <p>มรดกที่ตกถึงมือ: ${fiat} (${plan.legacyMoney.toFixed(8)} ${WORLD.currency})</p>
      </div>
    `;
  }
}
