import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { App } from "../src/ui/App";
import { domWindow } from "./setup-dom";
import { GameState } from "../src/core/model/GameState";
import { Character } from "../src/core/model/Character";
import { serializeGame } from "../src/core/save/SaveManager";
import { persistSave } from "../src/infra/localSave";
import { makeCharacter } from "./helpers";

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
  // Skip the first-run welcome screen; it has its own test below.
  domWindow.localStorage.setItem("life-simulator.onboarded", "1");
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

describe("Phase 5 turn-loop UX", () => {
  test("the first visit shows the welcome screen before the birth setup", () => {
    domWindow.localStorage.removeItem("life-simulator.onboarded");
    const root = mount();

    expect(root.textContent).toContain("ยินดีต้อนรับสู่ life simulator");
    expect(root.querySelector("#birth-setup")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='welcome-done']")?.click();
    expect(root.querySelector("#birth-setup")).not.toBeNull();
    expect(domWindow.localStorage.getItem("life-simulator.onboarded")).toBe("1");

    // The second visit skips the welcome and lands on the setup.
    document.body.innerHTML = "";
    const again = mount();
    expect(again.textContent).not.toContain("ยินดีต้อนรับ");
    expect(again.querySelector("#birth-setup")).not.toBeNull();
  });

  test("advancing the year shows the year report card with the allowance", () => {
    const root = mount();
    startLife(root, "ทดสอบ");

    // Under six there is no allowance, so the report card stays hidden.
    expect(root.querySelector(".news")).toBeNull();

    for (let i = 0; i < 7; i += 1) {
      root.querySelector<HTMLButtonElement>("[data-do='advance']")?.click();
    }
    const report = root.querySelector(".news");
    expect(report).not.toBeNull();
    expect(report?.textContent).toContain("สิ่งที่เกิดขึ้นในปี");
    expect(report?.textContent).toContain("ค่าขนม");
  });

  test("the stat strip expands into full bars and collapses again", () => {
    const root = mount();
    startLife(root, "ทดสอบ");

    const strip = root.querySelector<HTMLButtonElement>("[data-do='toggle-stats']");
    expect(strip).not.toBeNull();
    // Collapsed by default: pills, no bars.
    expect(strip?.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelectorAll(".stats .stat")).toHaveLength(0);

    strip?.click();
    expect(root.querySelectorAll(".stats .stat")).toHaveLength(4);
    root.querySelector<HTMLButtonElement>("[data-do='toggle-stats']")?.click();
    expect(root.querySelectorAll(".stats .stat")).toHaveLength(0);
  });

  test("non-age blocked cards hide behind a disclosure, age cards stay", () => {
    // Money=0 blocks every paid action at age 16; those go behind the
    // disclosure while the age-gated ones stay visible as the showFrom
    // promise (16 sees university greyed out until 17).
    const character = makeCharacter({ birthYear: 2026, money: 0 });
    const state = new GameState({
      year: 2042,
      seed: 7,
      rngState: 7,
      character,
      founderFamilyName: "หนึ่งชีวิต",
      timeLeft: 60,
    });
    persistSave(serializeGame(state, 100_000));

    const root = mount();
    // Paid cards (คาเฟ่, นวด) are money-blocked at balance zero.
    const toggle = root.querySelector<HTMLButtonElement>("[data-do='toggle-blocked']");
    expect(toggle).not.toBeNull();
    expect(toggle?.textContent).toContain("ยังทำไม่ได้");
    // Hidden until expanded.
    expect(root.querySelector("[data-do='cafe-movie']")).toBeNull();

    toggle?.click();
    const revealed = root.querySelector<HTMLButtonElement>("[data-do='cafe-movie']");
    expect(revealed).not.toBeNull();
    expect(revealed?.disabled).toBe(true);
    expect(revealed?.textContent).toContain("เงินไม่พอ");
    // The university card is age-blocked and must stay visible without
    // opening the disclosure.
    expect(root.querySelector("[data-do='enroll-university']")).not.toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='toggle-blocked']")?.click();
    expect(root.querySelector("[data-do='cafe-movie']")).toBeNull();
  });

  test("the jobs panel collapses to a status row and expands on tap", () => {
    // Employed at the best job for her age: nothing left to apply for,
    // so the panel rests as one row.
    const character = makeCharacter({ birthYear: 2026, money: 0.01 });
    character.job.id = "part-time-shop";
    character.job.level = 5;
    character.job.years = 2;
    const state = new GameState({
      year: 2041,
      seed: 7,
      rngState: 7,
      character,
      founderFamilyName: "หนึ่งชีวิต",
      timeLeft: 60,
    });
    persistSave(serializeGame(state, 100_000));

    const root = mount();
    expect(root.querySelector(".status-row")).not.toBeNull();
    expect(root.textContent).toContain("พนักงานพาร์ตไทม์ร้านสะดวกซื้อ ระดับ 5");
    expect(root.querySelector("[data-do='toggle-jobs']")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='toggle-career']")?.click();
    expect(root.querySelector(".status-row")).toBeNull();
    expect(root.querySelector("[data-do='toggle-jobs']")).not.toBeNull();
    expect(root.querySelector("[data-do='quit-job']")).not.toBeNull();
  });

  test("a card newly unlocked this life wears the new badge for one year", () => {
    // Spare cash keeps the cafe card runnable so the badge itself is
    // what the assertion reads, not a money block.
    const character = makeCharacter({ birthYear: 2026, money: 0.01 });
    const state = new GameState({
      year: 2031,
      seed: 7,
      rngState: 7,
      character,
      founderFamilyName: "หนึ่งชีวิต",
      timeLeft: 60,
      // Everything the age-5 menu offered is already known; the cafe
      // card unlocks at six and must therefore wear the badge.
      seenActions: [
        "toys",
        "story",
        "rest",
        "sleep",
        "study",
        "exercise",
        "read",
        "movie",
      ],
    });
    persistSave(serializeGame(state, 100_000));

    const root = mount();
    // Age 5: the cafe card is not visible yet.
    expect(root.querySelector("[data-do='cafe-movie']")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='advance']")?.click();
    const cafe = root.querySelector("[data-do='cafe-movie']");
    expect(cafe?.textContent).toContain("ใหม่");
    // A card she has seen since birth wears no badge.
    const rest = root.querySelector("[data-do='rest']");
    expect(rest?.textContent).not.toContain("ใหม่");

    // Finishing the year clears the badge.
    root.querySelector<HTMLButtonElement>("[data-do='advance']")?.click();
    expect(root.querySelector("[data-do='cafe-movie']")?.textContent).not.toContain("ใหม่");
  });

  test("the year button tracks the time left in the current year", () => {
    const root = mount();
    startLife(root, "ทดสอบ");

    // Age 0 budget is 60 and sleep costs 40, so the hint counts down.
    const hint = () => root.querySelector(".advance-hint")?.textContent ?? "";
    expect(hint()).toContain("ยังใช้เวลาไม่หมด");
    expect(hint()).toContain("(60)");

    root.querySelector<HTMLButtonElement>("[data-do='sleep']")?.click();
    expect(hint()).toContain("(20)");
  });

  test("the BTC rate note lives on the more tab, not on the HUD", async () => {
    const root = mount();
    startLife(root, "ทดสอบ");
    for (let tick = 0; tick < 10; tick += 1) {
      await Promise.resolve();
    }

    expect(root.querySelector(".hud")?.textContent).not.toContain("1 BTC");
    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    const rate = root.querySelector(".menu-rate");
    expect(rate).not.toBeNull();
    expect(rate?.textContent).toContain("1 BTC");
  });
});
