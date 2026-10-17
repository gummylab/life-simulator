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

/** Life log tab: newest entry on top, repeats merged. */
export class TimelineView {
  constructor(private readonly entries: readonly TimelineEntry[]) {}

  render(): TemplateResult {
    const items =
      this.entries.length === 0
        ? html`<li class="muted">ยังไม่มีเรื่องราวในชีวิต เริ่มด้วยการเลือกกิจกรรมแรกได้เลย</li>`
        : groupTimelineEntries(this.entries).map(
            (entry) => html`
              <li>
                <span class="entry-year">ปี ${entry.year} (อายุ ${entry.age})</span>
                ${entry.text}
                ${entry.count > 1
                  ? html`<span class="entry-count">×${entry.count}</span>`
                  : nothing}
              </li>
            `,
          );

    return html`
      <section class="panel">
        <h2>${icon("ScrollText", 18)}บันทึกชีวิต</h2>
        <ol class="timeline">${items}</ol>
      </section>
    `;
  }
}
