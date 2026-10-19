import { html, nothing, type TemplateResult } from "lit";
import type { Game } from "../core/Game";
import type { JobBlockReason } from "../core/systems/CareerSystem";
import type { GameContent } from "../core/model/GameContent";
import type { JobSpec } from "../core/model/JobSpec";
import { PROMOTION_RAISE } from "../core/config";
import { icon } from "./icons";
import { STAT_LABELS } from "./stats";
import { moneyChip } from "./effectChips";

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
        ${open.length > 0 ? html`<div class="rows">${open.map(({ job }) => this.jobRow(job, null))}</div>` : nothing}
        ${this.showAllJobs && locked.length > 0
          ? html`<div class="rows">
              ${locked.map(({ job, reason }) => this.jobRow(job, reason))}
            </div>`
          : nothing}
        ${locked.length > 0
          ? html`<button type="button" class="ghost" data-do="toggle-jobs">
              ${this.showAllJobs
                ? "ซ่อนงานที่ยังเข้าไม่ถึง"
                : `ดูงานที่ยังเข้าไม่ถึง (${locked.length})`}
            </button>`
          : nothing}
        ${open.length === 0 && !this.showAllJobs
          ? html`<button type="button" class="ghost" data-do="toggle-career">ซ่อน</button>`
          : nothing}
      </section>
    `;
  }

  /**
   * The collapsed row the life tab shows when no job is open to apply for:
   * one tap expands the full panel. While a job is open the panel expands
   * itself, so this row only appears once the list would be all-locked
   * reading anyway.
   */
  statusRow(): TemplateResult {
    const character = this.game.character;
    const content = this.game.gameContent;
    const spec = content?.jobs.find((job) => job.id === character.job.id) ?? null;
    const label = spec
      ? `${spec.label} ระดับ ${character.job.level}`
      : "ยังไม่มีงานทำ";
    return html`
      <section class="panel status-row status-row-jobs">
        <button type="button" class="row-button" data-do="toggle-career">
          <span class="action-icon">${icon("Briefcase", 16)}</span>
          <span class="action-label">${label}</span>
          <span class="muted">ดูงาน${icon("ChevronRight", 14)}</span>
        </button>
      </section>
    `;
  }

  /** One apply card; the reason line appears only while blocked. */
  private jobRow(job: JobSpec, reason: JobBlockReason | null): TemplateResult {
    return html`
      <button
        type="button"
        class="action"
        data-do=${`apply:${job.id}`}
        ?disabled=${reason !== null}
      >
        <span class="action-body">
          <span class="action-label">${job.label}</span>
          <span class="action-meta">
            ${moneyChip(job.salary, this.rateUsd)}
            <span class="chip">${icon("Clock", 12)}${job.timeCost}</span>
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
        <span class="job-current-title">${icon("Briefcase", 15)}${spec.label}</span>
        <span class="action-meta">
          ${moneyChip(salary, this.rateUsd)}
          <span class="chip">อายุงาน ${character.job.years} ปี</span>
          <span class="chip">ระดับ ${character.job.level}</span>
        </span>
        <button type="button" class="ghost" data-do="quit-job">ออกจากงาน</button>
      </div>
    `;
  }
}
