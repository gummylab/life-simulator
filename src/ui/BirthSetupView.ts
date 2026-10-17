const GENDER_CHOICES: readonly { value: string; label: string }[] = [
  { value: "random", label: "สุ่มให้" },
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
];

/**
 * First screen of the game. The player types a given name and a family
 * name, then picks a gender, or lets the game roll the names.
 * Empty fields are filled in by the game right before the life starts.
 */
export class BirthSetupView {
  render(): string {
    const genderChoices = GENDER_CHOICES.map(
      (choice, index) => `
        <label class="choice">
          <input type="radio" name="gender" value="${choice.value}" ${index === 0 ? "checked" : ""} />
          <span>${choice.label}</span>
        </label>`,
    ).join("");

    return `
      <section class="panel setup">
        <h2>ตั้งค่าก่อนเกิด</h2>
        <form id="birth-setup">
          <div class="field">
            <label for="given-name">ชื่อ</label>
            <div class="field-row">
              <input id="given-name" name="givenName" type="text" placeholder="เว้นว่างเพื่อให้สุ่มให้" autocomplete="off" />
              <button type="button" data-do="random-name">สุ่มให้</button>
            </div>
          </div>

          <div class="field">
            <label for="family-name">ชื่อตระกูล</label>
            <div class="field-row">
              <input id="family-name" name="familyName" type="text" placeholder="เว้นว่างเพื่อให้สุ่มให้" autocomplete="off" />
            </div>
          </div>

          <div class="field">
            <span class="field-label">เพศ</span>
            <div class="choices">${genderChoices}</div>
          </div>

          <button type="submit" class="advance">เริ่มตระกูล</button>
        </form>
      </section>`;
  }
}
