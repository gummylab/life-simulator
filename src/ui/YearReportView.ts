import { html, type TemplateResult } from "lit";
import { icon } from "./icons";

/**
 * The year report card (Phase 5, turn-loop UI). Sits above the action
 * menu and lists what the year-start systems recorded: random events,
 * allowance, promotions, graduations. It stays until the next year ends,
 * because cause and effect must be readable at the moment the player
 * looks for it, not as a three-second toast.
 */
export class YearReportView {
  constructor(
    /** The year the news belongs to (already ticked when recorded). */
    private readonly year: number,
    private readonly news: readonly string[],
  ) {}

  render(): TemplateResult {
    if (this.news.length === 0) {
      return html``;
    }
    const lines = this.news.map((line) => html`<li>${line}</li>`);
    return html`
      <section class="panel news">
        <h2>${icon("Newspaper", 18)}สิ่งที่เกิดขึ้นในปี ${this.year}</h2>
        <ul class="news-list">${lines}</ul>
      </section>
    `;
  }
}
