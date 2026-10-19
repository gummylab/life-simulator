import { html, nothing, type TemplateResult } from "lit";
import type { PlayerAction } from "../core/model/PlayerAction";
import type { ActionBlockReason } from "../core/Game";
import { ACTION_GROUPS, groupFor } from "./actionGroups";
import { costChips, statDeltaChips } from "./effectChips";
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
  looks: "รูปลักษณ์ยังไม่พอ",
  partner: "ยังไม่มีคนรัก",
  taken: "มีคนรักอยู่แล้ว",
  spouse: "ต้องแต่งงานก่อน",
  alone: "ไม่มีใครในครอบครัวให้ใช้เวลา",
  orphan: "ไม่มีพ่อแม่ให้ดูแล",
  done: "ทำไปแล้ว",
};

/** One block of cards: a titled group with the actions it owns. */
interface RenderedGroup {
  readonly id: string;
  readonly title: TemplateResult;
  readonly entries: readonly MenuEntry[];
  readonly hasRunnable: boolean;
}

/**
 * The action menu (ADR 0016). Cards are single-column rows grouped by what
 * the player is trying to do, and every row previews both the cost and the
 * stat deltas, so a tap is a decision rather than a guess.
 *
 * Runnable blocks float above the rest so the next possible tap is always
 * near the top; within a block runnable cards come first, then the age
 * gates that keep the showFrom promise, then (behind a disclosure) the
 * cards blocked for every other reason.
 */
export class MenuView {
  constructor(
    private readonly entries: readonly MenuEntry[],
    private readonly rateUsd = 0,
    private readonly seen: ReadonlySet<string> = new Set(),
    private readonly showBlocked = false,
  ) {}

  render(): TemplateResult {
    if (this.entries.length === 0) {
      return html`
        <section class="panel">
          <h2>${icon("ListChecks", 18)}สิ่งที่ทำได้ในปีนี้</h2>
          <p class="muted">ยังไม่มีกิจกรรมที่ทำได้ในวัยนี้</p>
        </section>
      `;
    }

    const groups = this.buildGroups();
    const hiddenCount = this.entries.filter(
      ({ reason }) => reason !== null && reason !== "age",
    ).length;

    return html`
      <section class="panel">
        <h2>${icon("ListChecks", 18)}สิ่งที่ทำได้ในปีนี้</h2>
        ${groups.map((group) => this.groupBlock(group))}
        ${hiddenCount > 0
          ? html`<button type="button" class="ghost" data-do="toggle-blocked">
              ${this.showBlocked
                ? "ซ่อนรายการที่ยังทำไม่ได้"
                : `ยังทำไม่ได้ (${hiddenCount})`}
            </button>`
          : nothing}
      </section>
    `;
  }

  /**
   * Buckets the entries into the declared groups and orders them so a
   * group holding a runnable card always sits above a group that does not.
   */
  private buildGroups(): RenderedGroup[] {
    const buckets = ACTION_GROUPS.map((group) => ({
      group,
      entries: this.entries.filter((entry) => groupFor(entry.action.id).id === group.id),
    })).filter((bucket) => bucket.entries.length > 0);

    return buckets
      .map((bucket) => ({
        id: bucket.group.id,
        title: html`${icon(bucket.group.iconName, 15)}<span>${bucket.group.label}</span>`,
        entries: [
          ...bucket.entries.filter((entry) => entry.reason === null),
          ...bucket.entries.filter((entry) => entry.reason === "age"),
          ...bucket.entries.filter(
            (entry) => entry.reason !== null && entry.reason !== "age",
          ),
        ],
        hasRunnable: bucket.entries.some((entry) => entry.reason === null),
      }))
      // Stable sort: runnable blocks first, declaration order inside each half.
      .sort((a, b) => Number(b.hasRunnable) - Number(a.hasRunnable));
  }

  /** One titled block. The hidden kind is skipped while collapsed. */
  private groupBlock(group: RenderedGroup): TemplateResult {
    const visible = group.entries.filter(
      ({ reason }) => reason === null || reason === "age" || this.showBlocked,
    );
    if (visible.length === 0) {
      return html``;
    }
    return html`
      <h3 class="group-title">${group.title}</h3>
      <div class="rows">
        ${visible.map(({ action, reason }) => this.actionRow(action, reason))}
      </div>
    `;
  }

  /** One card; the reason line appears only while blocked. */
  private actionRow(action: PlayerAction, reason: ActionBlockReason | null): TemplateResult {
    return html`
      <button
        type="button"
        class="action"
        data-do=${action.id}
        ?disabled=${reason !== null}
      >
        <span class="action-icon">${actionIcon(action.id)}</span>
        <span class="action-body">
          <span class="action-label"
            >${action.label}
            ${!this.seen.has(action.id)
              ? html`<span class="chip chip-new">ใหม่</span>`
              : nothing}</span
          >
          <span class="action-meta">
            ${statDeltaChips(action)} ${costChips(action, this.rateUsd)}
          </span>
          ${reason !== null
            ? html`<span class="action-reason">${REASON_LABELS[reason]}</span>`
            : nothing}
        </span>
      </button>
    `;
  }
}
