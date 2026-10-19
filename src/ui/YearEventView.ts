import { html, type TemplateResult } from "lit";
import type { PendingEvent } from "../core/model/GameState";
import { icon } from "./icons";

/**
 * The question a yearly event asks, shown on the life tab until the player
 * answers (ADR 0017).
 *
 * It does not block the rest of the screen: the player can still spend the
 * year's time and come back to it. Only a new event is held back while a
 * question waits, so the answer always belongs to the year on screen. An
 * unanswered question expires when the year ends.
 */
export class YearEventView {
  constructor(private readonly event: PendingEvent) {}

  render(): TemplateResult {
    return html`
      <section class="panel event-card">
        <h2>${icon("Milestone", 18)}เรื่องที่ต้องตัดสินใจ</h2>
        <p class="event-text">${this.event.text}</p>
        <div class="event-choices">
          ${this.event.options.map(
            (option, index) => html`
              <button type="button" class="choice-button" data-do=${`event:${index}`}>
                <span class="choice-index">${index + 1}</span>
                <span>${option.label}</span>
              </button>
            `,
          )}
        </div>
      </section>
    `;
  }
}
