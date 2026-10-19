import { html, nothing, type TemplateResult } from "lit";
import type { TimelineEntry } from "../core/model/GameState";
import { groupTimelineEntries } from "./TimelineView";
import { icon } from "./icons";

/** How many grouped lines the collapsed feed shows before the expand button. */
const COLLAPSED_LINES = 4;

/**
 * The year feed (Phase 6): every line the current year recorded, read
 * straight from the timeline, so an action's result appears the moment
 * the player taps it and survives a refresh. Entries run oldest first
 * with the newest line at the bottom, right against the action cards.
 * Repeated lines merge as "×n"; the latest four stay visible and the
 * rest wait behind "ดูทั้งปี". An empty year renders nothing at all.
 */
export class YearFeedView {
  constructor(
    /** The year being shown (already ticked when the lines recorded). */
    private readonly year: number,
    /** The full timeline, oldest first; filtered to this year here. */
    private readonly timeline: readonly TimelineEntry[],
    /** Whether the feed is expanded to the whole year. */
    private readonly expanded = false,
  ) {}

  render(): TemplateResult {
    const groups = groupTimelineEntries(
      this.timeline.filter((entry) => entry.year === this.year),
    );
    if (groups.length === 0) {
      return html``;
    }

    // Latest N lines first; the oldest ones only appear once expanded.
    const visible = this.expanded ? groups : groups.slice(-COLLAPSED_LINES);
    const lines = visible.map(
      (entry) => html`
        <li>
          ${entry.text}
          ${entry.count > 1 ? html`<span class="entry-count">×${entry.count}</span>` : nothing}
        </li>
      `,
    );

    return html`
      <section class="panel feed">
        <h2>${icon("Newspaper", 18)}บันทึกปี ${this.year}</h2>
        <ul class="feed-list">${lines}</ul>
        ${groups.length > COLLAPSED_LINES
          ? html`<button type="button" class="ghost" data-do="toggle-feed">
              ${this.expanded
                ? "ซ่อนรายการเก่า"
                : `ดูทั้งปี (${groups.length})`}
            </button>`
          : nothing}
      </section>
    `;
  }
}
