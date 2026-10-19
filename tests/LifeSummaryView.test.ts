import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { render } from "lit";
import { html } from "lit";
import { domWindow } from "./setup-dom";
import { LifeSummaryView } from "../src/ui/LifeSummaryView";
import { GameState } from "../src/core/model/GameState";
import { Character } from "../src/core/model/Character";

/** Builds a dead 78-year-old with a full school and career record. */
function deadState(): GameState {
  const character = new Character({
    givenName: "ลีแอม",
    familyName: "มิลเลอร์",
    gender: "male",
    birthYear: 1948,
    maxLifespan: 78,
    money: 0.02,
  });
  character.education.primarySchool = "ซันนี่เดล เอเลเมนทารี";
  character.education.secondarySchool = "กรีนฟิลด์ ไฮ";
  character.job.id = "engineer";
  character.job.years = 30;
  character.job.level = 3;
  character.die("oldAge");

  const state = new GameState({
    year: 2026,
    seed: 1,
    rngState: 1,
    character,
    founderFamilyName: "มิลเลอร์",
    timeLeft: 0,
  });
  return state;
}

function mount(view: LifeSummaryView): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  render(html`${view.render()}`, root);
  return root;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterAll(() => {
  domWindow.close();
});

describe("LifeSummaryView biography", () => {
  test("the dead screen lists education, last career and inheritance", () => {
    const root = mount(new LifeSummaryView(deadState(), 100_000));
    const text = root.textContent ?? "";
    expect(text).toContain("ชีวประวัติของ ลีแอม มิลเลอร์");
    expect(text).toContain("จบชั้นมัธยม (กรีนฟิลด์ ไฮ)");
    expect(text).toContain("วิศวกร");
    expect(text).toContain("มรดกที่ทิ้งไว้");
    expect(text).toContain("1948");
    expect(text).toContain("2026");
    expect(text).toContain("สาเหตุการเสียชีวิต");
  });

  test("the copy button exists only for the dead, not the living", () => {
    const deadRoot = mount(new LifeSummaryView(deadState(), 100_000));
    expect(deadRoot.querySelector("[data-do='copy-bio']")).not.toBeNull();

    document.body.innerHTML = "";
    const living = new Character({
      givenName: "โอลิเวีย",
      familyName: "คลาร์ก",
      gender: "female",
      birthYear: 2000,
      maxLifespan: 100,
      money: 0.01,
    });
    const state = new GameState({
      year: 2026,
      seed: 1,
      rngState: 1,
      character: living,
      founderFamilyName: "คลาร์ก",
      timeLeft: 10,
    });
    const livingRoot = mount(new LifeSummaryView(state, 100_000));
    expect(livingRoot.querySelector("[data-do='copy-bio']")).toBeNull();
    expect(livingRoot.textContent ?? "").toContain("กลับไปเล่นต่อ");
  });

  test("biographyText carries the BTC amount and its USD value", () => {
    const text = new LifeSummaryView(deadState(), 100_000).biographyText();
    expect(text).toContain("0.02000000 BTC");
    // $2,000 at the given rate, formatted with a comma.
    expect(text).toContain("$2,000");
    expect(text).toContain("วิศวกร");
    expect(text).toMatch(/^- /m); // one fact per line, dash-prefixed
  });

  test("an absurdly rich life still renders readable numbers", () => {
    // 100,000 BTC at $100k each: the USD figure hits nine digits and the
    // BTC figure keeps eight decimals. Neither may break the template.
    const state = deadState();
    state.character.money = 100_000;
    const root = mount(new LifeSummaryView(state, 100_000));
    const text = root.textContent ?? "";
    expect(text).toContain("100000.00000000 BTC");
    expect(text).toContain("$10,000,000,000");
    // No scientific notation may leak into the UI.
    expect(text).not.toContain("e+");
  });
});
