import { html, nothing, type TemplateResult } from "lit";
import type { Game } from "../core/Game";
import type { JobBlockReason } from "../core/systems/CareerSystem";
import type { GameContent } from "../core/model/GameContent";
import { PROMOTION_RAISE } from "../core/config";
import { icon } from "./icons";
import { formatUsd } from "./format";

/** Thai messages for why a job cannot be taken right now. */
const JOB_REASON_LABELS: Record<JobBlockReason, string> = {
  age: "ยังไม่ถึงวัยทำงาน",
  education: "การศึกษาไม่ถึง",
  stat: "ค่าสถานะไม่พอ",
  already: "ทำอยู่แล้ว",
};

/** Salary chip: BTC first, USD as the readable check figure. */
function salaryChip(salary: number, rateUsd: number): TemplateResult {
  return html`<span class="chip chip-gain"
    >${salary} BTC <span class="muted">≈ ${formatUsd(salary * rateUsd)}</span></span
  >`;
}

/**
 * The career panel: current job at the top, then every catalog job as an
 * apply card. Blocked jobs stay visible with the reason, the same way the
 * action menu teaches its rules.
 */
export class CareerView {
  constructor(
    private readonly game: Game,
    private readonly rateUsd = 0,
  ) {}

  render(): TemplateResult {
    const content = this.game.gameContent;
    const character = this.game.character;
    if (!content || content.jobs.length === 0) {
      return html``;
    }
    // Hide the whole panel until the youngest job's age or current work.
    const youngest = Math.min(...content.jobs.map((job) => job.minAge));
    if (character.job.id === null && this.game.age < youngest) {
      return html``;
    }

    return html`
      <section class="panel">
        <h2>${icon("Briefcase", 18)}การงาน</h2>
        ${this.currentJob(content)}
        <div class="actions">
          ${content.jobs.map((job) => {
            const reason = this.game.jobBlockReason(job);
            return html`
              <button
                type="button"
                class="action"
                data-do=${`apply:${job.id}`}
                ?disabled=${reason !== null}
              >
                <span class="action-main">
                  <span class="action-label">${job.label}</span>
                  <span class="action-cost">
                    ${salaryChip(job.salary, this.rateUsd)}
                    <span class="chip">${job.timeCost} เวลา</span>
                  </span>
                  ${reason !== null
                    ? html`<span class="action-reason">${JOB_REASON_LABELS[reason]}</span>`
                    : nothing}
                </span>
              </button>
            `;
          })}
        </div>
      </section>
    `;
  }

  /** The held job with seniority, level and a quit button. */
  private currentJob(content: GameContent | null): TemplateResult {
    const character = this.game.character;
    if (character.job.id === null) {
      return html`<p class="muted">ยังไม่มีงานทำ</p>`;
    }
    const spec = content?.jobs.find((job) => job.id === character.job.id);
    if (!spec) {
      return html`<p class="muted">ยังไม่มีงานทำ</p>`;
    }
    const salary = spec.salary * (1 + PROMOTION_RAISE * character.job.level);
    return html`
      <div class="job-current">
        <span class="action-label">${icon("Briefcase", 14)}${spec.label}</span>
        <span class="action-cost">
          ${salaryChip(salary, this.rateUsd)}
          <span class="chip">อายุงาน ${character.job.years} ปี</span>
          <span class="chip">ระดับ ${character.job.level}</span>
        </span>
        <button type="button" class="ghost" data-do="quit-job">ออกจากงาน</button>
      </div>
    `;
  }
}
