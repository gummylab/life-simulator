import { html, type TemplateResult } from "lit";
import { icon } from "./icons";

const GENDER_CHOICES: readonly { value: string; label: string; iconName: "Dices" | "UserRound" }[] = [
  { value: "random", label: "สุ่มให้", iconName: "Dices" },
  { value: "female", label: "หญิง", iconName: "UserRound" },
  { value: "male", label: "ชาย", iconName: "UserRound" },
];

/**
 * First screen of the game (ADR 0014). The player types a given name and a
 * family name, then picks a gender, or lets the game roll the names.
 * Empty fields are filled in by the game right before the life starts.
 */
export class BirthSetupView {
  render(): TemplateResult {
    return html`
      <section class="panel setup">
        <div class="setup-brand">
          life simulator <span>by onlygummy</span>
        </div>
        <h2>${icon("Baby", 18)}ตั้งค่าก่อนเกิด</h2>
        <p class="muted">
          หนึ่งชีวิตเดินไปข้างหน้าปีละหนึ่งก้าว คุณเป็นคนตั้งชื่อคนแรกของตระกูลนี้
        </p>

        <form id="birth-setup">
          <div class="field">
            <label for="given-name">ชื่อ</label>
            <div class="field-row">
              <input
                id="given-name"
                name="givenName"
                type="text"
                placeholder="เว้นว่างเพื่อให้สุ่มให้"
                autocomplete="off"
              />
            </div>
          </div>

          <div class="field">
            <label for="family-name">ชื่อตระกูล</label>
            <input
              id="family-name"
              name="familyName"
              type="text"
              placeholder="เว้นว่างเพื่อให้สุ่มให้"
              autocomplete="off"
            />
          </div>

          <div class="field">
            <span class="field-label">เพศ</span>
            <div class="choices">
              ${GENDER_CHOICES.map(
                (choice, index) => html`
                  <label class="choice">
                    <input
                      type="radio"
                      name="gender"
                      value=${choice.value}
                      ?checked=${index === 0}
                    />
                    <span>${icon(choice.iconName, 14)}${choice.label}</span>
                  </label>
                `,
              )}
            </div>
          </div>

          <button type="button" class="ghost" data-do="random-name">
            ${icon("Dices", 16)}สุ่มชื่อให้
          </button>

          <button type="submit" class="advance">
            ${icon("Sparkles", 18)}<span>เริ่มตระกูล</span>
          </button>
        </form>
      </section>
    `;
  }
}
