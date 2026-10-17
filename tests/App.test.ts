import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { App } from "../src/ui/App";
import { domWindow } from "./setup-dom";
import { GameState } from "../src/core/model/GameState";
import { Character } from "../src/core/model/Character";
import { serializeGame } from "../src/core/save/SaveManager";
import { persistSave } from "../src/infra/localSave";

/**
 * End-to-end smoke tests for the lit-based UI: the happy-dom document
 * runs the real App, real views and real game rules. These tests exist
 * because the UI renders through the library now and a broken template
 * would otherwise only surface in the browser.
 */

function mount(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  new App(root).start();
  return root;
}

/** Fills the birth form with a known name and submits it. */
function startLife(root: HTMLElement, givenName: string): void {
  const nameField = root.querySelector<HTMLInputElement>("#given-name");
  if (nameField) {
    nameField.value = givenName;
  }
  root
    .querySelector("#birth-setup")
    // happy-dom's Event class is not structurally identical to the DOM lib
    // type, but the runtime contract (bubbling submit event) is the same.
    ?.dispatchEvent(new domWindow.Event("submit", { bubbles: true, cancelable: true }) as unknown as Event);
}

beforeEach(() => {
  domWindow.localStorage.clear();
  document.body.innerHTML = "";
});

afterAll(() => {
  domWindow.close();
});

describe("App smoke test on happy-dom", () => {
  test("the game boots into the birth setup inside the phone frame", () => {
    const root = mount();
    expect(root.querySelector(".device")).not.toBeNull();
    expect(root.querySelector("#birth-setup")).not.toBeNull();
    expect(root.querySelector(".hud")).toBeNull();
  });

  test("submitting the setup starts a life with the typed name", () => {
    const root = mount();
    startLife(root, "ทดสอบ");

    expect(root.querySelector("#birth-setup")).toBeNull();
    expect(root.querySelector(".hud")).not.toBeNull();
    expect(root.querySelector(".action")).not.toBeNull();
    expect(root.textContent).toContain("ทดสอบ");
  });

  test("clicking an action records it and the log tab shows it", () => {
    const root = mount();
    startLife(root, "ทดสอบ");

    root.querySelector<HTMLButtonElement>(".action")?.click();
    root.querySelector<HTMLButtonElement>("[data-do='tab:log']")?.click();

    const timeline = root.querySelector(".timeline");
    expect(timeline).not.toBeNull();
    // The first baby action is "เล่นของเล่น"; its result must be logged.
    expect(timeline?.textContent).toContain("ของเล่น");
  });

  test("ending the year raises the toast and parks a save file", () => {
    const root = mount();
    startLife(root, "ทดสอบ");

    root.querySelector<HTMLButtonElement>("[data-do='advance']")?.click();

    expect(root.querySelector(".toast")).not.toBeNull();
    expect(domWindow.localStorage.getItem("life-simulator.save")).not.toBeNull();
  });

  test("a fresh mount resumes the person saved by the previous session", () => {
    startLife(mount(), "ต่อเนื่อง");

    const resumed = mount();
    expect(resumed.querySelector("#birth-setup")).toBeNull();
    expect(resumed.textContent).toContain("ต่อเนื่อง");
  });

  test("the HUD shows only on the action tab", () => {
    const root = mount();
    startLife(root, "ทดสอบ");
    expect(root.querySelector(".hud")).not.toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='tab:log']")?.click();
    expect(root.querySelector(".hud")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    expect(root.querySelector(".hud")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='tab:act']")?.click();
    expect(root.querySelector(".hud")).not.toBeNull();
  });

  test("the more tab is a menu list opening the full-screen how-to", () => {
    const root = mount();
    startLife(root, "ทดสอบ");
    // The how-to is gone from the action tab now.
    expect(root.querySelector(".onboarding")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    expect(root.querySelector(".menu-row")).not.toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='open-help']")?.click();
    expect(root.querySelector(".onboarding")).not.toBeNull();
    expect(root.querySelector(".hud")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='back']")?.click();
    expect(root.querySelector(".onboarding")).toBeNull();
    expect(root.querySelector(".menu-row")).not.toBeNull();
  });

  test("restart shows the farewell summary and wipes the save on the second tap", () => {
    const root = mount();
    startLife(root, "ทดสอบ");
    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    root.querySelector<HTMLButtonElement>("[data-do='open-restart']")?.click();

    // Full farewell screen: still-alive wording, no HUD, save untouched.
    expect(root.querySelector(".hud")).toBeNull();
    expect(root.textContent).toContain("ปัจจุบันอายุ");
    expect(domWindow.localStorage.getItem("life-simulator.save")).not.toBeNull();

    const restartButton = () => root.querySelector<HTMLButtonElement>("[data-do='restart']");

    // First tap only arms the button.
    restartButton()?.click();
    expect(restartButton()?.textContent).toContain("แตะอีกครั้งเพื่อยืนยัน");
    expect(domWindow.localStorage.getItem("life-simulator.save")).not.toBeNull();

    // Second tap wipes the save and returns to birth setup.
    restartButton()?.click();
    expect(root.querySelector("#birth-setup")).not.toBeNull();
    expect(domWindow.localStorage.getItem("life-simulator.save")).toBeNull();
  });

  test("the farewell screen has a way back to the menu", () => {
    const root = mount();
    startLife(root, "ทดสอบ");
    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    root.querySelector<HTMLButtonElement>("[data-do='open-restart']")?.click();

    root.querySelector<HTMLButtonElement>("[data-do='back']")?.click();
    expect(root.querySelector(".menu-row")).not.toBeNull();
    expect(domWindow.localStorage.getItem("life-simulator.save")).not.toBeNull();
  });

  test("the HUD shows the school stage once the child turns six", () => {
    const root = mount();
    startLife(root, "ทดสอบ");
    for (let i = 0; i < 6; i += 1) {
      root.querySelector<HTMLButtonElement>("[data-do='advance']")?.click();
    }
    expect(root.textContent).toContain("ชั้นประถมปีที่ 1");
  });

  test("the jobs panel appears at working age and hiring works", () => {
    const root = mount();
    startLife(root, "ทดสอบ");
    // Before 14 the panel stays hidden.
    expect(root.textContent).not.toContain("การงาน");

    for (let i = 0; i < 14; i += 1) {
      root.querySelector<HTMLButtonElement>("[data-do='advance']")?.click();
    }
    expect(root.textContent).toContain("การงาน");
    expect(root.textContent).toContain("พนักงานพาร์ตไทม์ร้านสะดวกซื้อ");

    root.querySelector<HTMLButtonElement>("[data-do='apply:part-time-shop']")?.click();
    expect(root.textContent).toContain("อายุงาน");
    expect(root.querySelector<HTMLButtonElement>("[data-do='quit-job']")).not.toBeNull();
  });

  test("a dead life's copy button puts the biography on the clipboard", async () => {
    // Park a finished life in storage so App resumes straight into the
    // death screen, then stub the clipboard and press copy.
    const character = new Character({
      givenName: "โนอา",
      familyName: "คลาร์ก",
      gender: "male",
      birthYear: 1948,
      maxLifespan: 78,
      money: 0.05,
    });
    character.education.secondarySchool = "กรีนฟิลด์ ไฮ";
    character.job.id = "teacher";
    character.job.years = 20;
    character.job.level = 2;
    character.die("oldAge");
    const state = new GameState({
      year: 2026,
      seed: 5,
      rngState: 5,
      character,
      founderFamilyName: "คลาร์ก",
      timeLeft: 0,
    });
    persistSave(serializeGame(state, 100_000));

    let captured = "";
    Object.defineProperty(domWindow.navigator, "clipboard", {
      configurable: true,
      value: { writeText: (text: string) => ((captured = text), Promise.resolve()) },
    });

    const root = mount();
    expect(root.textContent).toContain("ชีวประวัติของ โนอา คลาร์ก");
    root.querySelector<HTMLButtonElement>("[data-do='copy-bio']")?.click();
    // The clipboard write is awaited inside the handler; flush microtasks.
    await Promise.resolve();
    await Promise.resolve();
    expect(captured).toContain("BTC");
    // The USD figure comes from the drifted price model; only the shape matters here.
    expect(captured).toMatch(/\$[\d,]+/);
    expect(captured).toContain("ครู");
  });
});
