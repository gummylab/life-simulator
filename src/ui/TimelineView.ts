import type { TimelineEntry } from "../core/model/GameState";
import { escapeHtml } from "./format";

/** Scrolling life log, newest entry on top. */
export class TimelineView {
  constructor(private readonly entries: readonly TimelineEntry[]) {}

  render(): string {
    const items =
      this.entries.length === 0
        ? `<li class="muted">ยังไม่มีเรื่องราวในชีวิต เริ่มด้วยการเลือกกิจกรรมแรกได้เลย</li>`
        : this.entries
            .map(
              (entry) =>
                `<li><span class="entry-year">ปี ${entry.year} (อายุ ${entry.age})</span> ${escapeHtml(entry.text)}</li>`,
            )
            .join("");

    return `
      <section class="panel">
        <h2>บันทึกชีวิต</h2>
        <ol class="timeline">${items}</ol>
      </section>`;
  }
}
