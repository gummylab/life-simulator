import { html, nothing, type TemplateResult } from "lit";
import type { TimelineEntry } from "../core/model/GameState";
import { icon } from "./icons";

/** One life log line after merging repeats, with how many times it ran. */
export interface GroupedEntry {
  readonly year: number;
  readonly age: number;
  readonly text: string;
  readonly count: number;
}

/**
 * Merges runs of the same action in the same year, newest first.
 * Spamming one action ten times should read as one line with "x10",
 * not ten identical lines pushing the real news off the screen.
 */
export function groupTimelineEntries(entries: readonly TimelineEntry[]): GroupedEntry[] {
  const groups: GroupedEntry[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.year === entry.year && last.text === entry.text) {
      groups[groups.length - 1] = { ...last, count: last.count + 1 };
      continue;
    }
    groups.push({ year: entry.year, age: entry.age, text: entry.text, count: 1 });
  }
  return groups;
}

/**
 * The life log list itself, shared by the log sub-screen and the biography.
 * Entries must already be newest first; the caller decides the order so the
 * two screens cannot drift apart.
 */
export function timelineList(entries: readonly TimelineEntry[]): TemplateResult {
  if (entries.length === 0) {
    return html`<p class="muted">ยังไม่มีเรื่องราวในชีวิต เริ่มด้วยการเลือกกิจกรรมแรกได้เลย</p>`;
  }
  return html`
    <ol class="timeline">
      ${groupTimelineEntries(entries).map(
        (entry) => html`
          <li>
            <span class="entry-year">ปี ${entry.year} · อายุ ${entry.age}</span>
            <span class="entry-text"
              >${entry.text}
              ${entry.count > 1
                ? html`<span class="entry-count">×${entry.count}</span>`
                : nothing}</span
            >
          </li>
        `,
      )}
    </ol>
  `;
}

/** Full life log sub-screen: newest entry on top, repeats merged. */
export class TimelineView {
  constructor(private readonly entries: readonly TimelineEntry[]) {}

  render(): TemplateResult {
    return html`
      <section class="panel">
        <h2>${icon("ScrollText", 18)}บันทึกชีวิต</h2>
        <p class="muted summary-note">เรียงใหม่สุดไว้บนสุด ทุกบรรทัดของชีวิตอยู่ในนี้</p>
        ${timelineList(this.entries)}
        <div class="summary-actions">
          <button type="button" class="ghost" data-do="back">
            ${icon("ChevronLeft", 16)}กลับ
          </button>
        </div>
      </section>
    `;
  }
}
