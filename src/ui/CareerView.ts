import { html, nothing, type TemplateResult } from "lit";
import type { Game } from "../core/Game";
import type { JobBlockReason } from "../core/systems/CareerSystem";
import type { GameContent } from "../core/model/GameContent";
import type { JobSpec } from "../core/model/JobSpec";
import { PROMOTION_RAISE } from "../core/config";
import { icon } from "./icons";
import { STAT_LABELS } from "./stats";
import { formatUsd } from "./format";

/** Why a job cannot be taken, spelled out with the missing piece named. */
function jobReasonLabel(reason: JobBlockReason, job: JobSpec): string {
  switch (reason) {
    case "age":
      return `ต้องอายุ ${job.minAge} ปี`;
    case "education":
      return "การศึกษาไม่ถึง";
    case "stat":
      return job.statRequirement
        ? `${STAT_LABELS[job.statRequirement.stat]}ไม่พอ (${job.statRequirement.min})`
        : "ค่าสถานะไม่พอ";
    case "already":
      return "ทำอยู่แล้ว";
  }
}

/** Salary chip: BTC first, USD as the readable check figure. */
function salaryChip(salary: number, rateUsd: number): TemplateResult {
  return html`<span class="chip chip-gain"
    >${salary} BTC <span class="muted">≈ ${formatUsd(salary * rateUsd)}</span></span
  >`;
}

/**
 * The career panel: current job at the top, then the catalog jobs the
 * character can actually apply for. Jobs that are out of reach collapse
 * behind a toggle, so the panel stays short while the rules stay visible
 * on demand.
 */
export class CareerView {
  constructor(
    private readonly game: Game,
    private readonly rateUsd = 0,
    private readonly showAllJobs = false,
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

    // The held job already has its own card on top; skip it in the list.
    const entries = content.jobs
      .filter((job) => job.id !== character.job.id)
      .map((job) => ({ job, reason: this.game.jobBlockReason(job) }));
    const open = entries.filter((entry) => entry.reason === null);
    const locked = entries.filter((entry) => entry.reason !== null);

    return html`
      <section class="panel">
        <h2>${icon("Briefcase", 18)}การงาน</h2>
        ${this.currentJob(content)}
        <div class="actions">
          ${open.map(({ job }) => this.jobCard(job, null))}
          ${this.showAllJobs
            ? locked.map(({ job, reason }) => this.jobCard(job, reason))
            : nothing}
        </div>
        ${locked.length > 0
          ? html`<button type="button" class="ghost" data-do="toggle-jobs">
              ${this.showAllJobs
                ? "ซ่อนงานที่ยังเข้าไม่ถึง"
                : `ดูงานที่ยังเข้าไม่ถึง (${locked.length})`}
            </button>`
          : nothing}
      </section>
    `;
  }

  /** One apply card; the reason span appears only while blocked. */
  private jobCard(job: JobSpec, reason: JobBlockReason | null): TemplateResult {
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
            ? html`<span class="action-reason">${jobReasonLabel(reason, job)}</span>`
            : nothing}
        </span>
      </button>
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
