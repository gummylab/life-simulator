import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { App } from "../src/ui/App";
import { domWindow } from "./setup-dom";
import { deserializeGame } from "../src/core/save/SaveManager";
import { readSave } from "../src/infra/localSave";
import type { GameState } from "../src/core/model/GameState";

/**
 * Automated playtest (Task 4.3). A robot drives the real App through
 * happy-dom the way a player would: it clicks enabled buttons only, so
 * every rule (age gates, time, energy, money) decides what happens, not
 * the test. Four lives run back to back: two successions, an extinct
 * line, a two-tap restart and a female life whose surname changes on
 * marriage. The network stays disabled, so the offline BTC fallback is
 * exercised on every run.
 *
 * Not covered here: visual layout, a real touch screen and the live
 * CoinGecko price. Everything rule-related is automated.
 */

interface PlayOptions {
  /** Chase date/marry, or live alone on purpose. */
  readonly seekFamily: boolean;
  /** Children to have before stopping; 0 with seekFamily ends the line. */
  readonly childrenGoal: number;
}

/** Round 18 UI checks run once per life; tracked by these flags. */
interface PlayFlags {
  checkedSixteen: boolean;
  checkedJobToggle: boolean;
}

function mount(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  new App(root).start();
  return root;
}

/** Fills the birth form and submits it, optionally picking a gender. */
function startLife(
  root: HTMLElement,
  givenName: string,
  familyName: string,
  gender?: "female" | "male",
): void {
  const given = root.querySelector<HTMLInputElement>("#given-name");
  if (given) {
    given.value = givenName;
  }
  const family = root.querySelector<HTMLInputElement>("#family-name");
  if (family) {
    family.value = familyName;
  }
  if (gender) {
    const radio = root.querySelector<HTMLInputElement>(`input[value='${gender}']`);
    if (radio) {
      radio.checked = true;
    }
  }
  root
    .querySelector("#birth-setup")
    ?.dispatchEvent(
      new domWindow.Event("submit", { bubbles: true, cancelable: true }) as unknown as Event,
    );
}

/** The autosave, parsed; the robot reads rules from it every click. */
function savedState(): GameState | null {
  return deserializeGame(readSave() ?? "")?.state ?? null;
}

function clickEnabled(root: HTMLElement, selector: string): boolean {
  const el = root.querySelector<HTMLButtonElement>(selector);
  if (!el || el.disabled) {
    return false;
  }
  el.click();
  return true;
}

function deathScreenVisible(root: HTMLElement): boolean {
  return (
    root.querySelector("[data-do='open-succession']") !== null ||
    root.querySelector("[data-do='open-gameover']") !== null
  );
}

/** The menu panel, found by its heading so panel order can change freely. */
function menuPanel(root: HTMLElement): Element | null {
  for (const panel of Array.from(root.querySelectorAll("section.panel"))) {
    if (panel.querySelector("h2")?.textContent?.includes("สิ่งที่ทำได้")) {
      return panel;
    }
  }
  return null;
}

/** Blocked cards must sort below runnable ones whenever any is runnable. */
function assertMenuSorted(root: HTMLElement): void {
  const menu = menuPanel(root);
  if (!menu) {
    return;
  }
  const cards = Array.from(menu.querySelectorAll<HTMLButtonElement>("button.action"));
  if (cards.some((card) => !card.disabled)) {
    expect(cards[0]?.disabled).toBe(false);
  }
}

/**
 * One robot decision. Returns false when nothing is clickable, which
 * makes the caller end the year. Priority mirrors a real player: study
 * plans, then love, then work, then killing time.
 */
function doAction(root: HTMLElement, options: PlayOptions, flags: PlayFlags): boolean {
  const state = savedState();
  if (!state) {
    return false;
  }
  const age = state.year - state.character.birthYear;

  // --- Round 18 regression checks, once each -------------------------
  if (age === 16 && !flags.checkedSixteen) {
    // showFrom: the university decision is visible one year early, grey.
    const enroll = root.querySelector<HTMLButtonElement>("[data-do='enroll-university']");
    expect(enroll).not.toBeNull();
    expect(enroll?.disabled).toBe(true);
    flags.checkedSixteen = true;
  }
  if (!flags.checkedJobToggle && root.querySelector("[data-do='toggle-jobs']")) {
    // Collapsed jobs list expands and collapses again with real labels.
    root.querySelector<HTMLButtonElement>("[data-do='toggle-jobs']")?.click();
    expect(root.textContent).toContain("ซ่อนงานที่ยังเข้าไม่ถึง");
    root.querySelector<HTMLButtonElement>("[data-do='toggle-jobs']")?.click();
    expect(root.textContent).toContain("ดูงานที่ยังเข้าไม่ถึง");
    flags.checkedJobToggle = true;
  }
  if (age >= 14) {
    // Money chips carry the USD check figure, never raw BTC alone.
    // Money-cost cards can hide behind the blocked disclosure mid-year,
    // so peek behind it and close it again.
    const toggle = root.querySelector<HTMLButtonElement>("[data-do='toggle-blocked']");
    if (toggle) {
      toggle.click();
      expect(menuPanel(root)?.textContent).toContain("$");
      root.querySelector<HTMLButtonElement>("[data-do='toggle-blocked']")?.click();
    } else {
      expect(menuPanel(root)?.textContent).toContain("$");
    }
  }
  assertMenuSorted(root);

  // --- Player policy -------------------------------------------------
  if (clickEnabled(root, "[data-do='enroll-university']")) {
    return true;
  }
  if (options.seekFamily) {
    if (clickEnabled(root, "[data-do='date']")) {
      return true;
    }
    if (clickEnabled(root, "[data-do='marry']")) {
      return true;
    }
    const children = state.character.family.children.length;
    if (children < options.childrenGoal && clickEnabled(root, "[data-do='have-child']")) {
      return true;
    }
  }
  // Apply only while unemployed: otherwise the robot would ping-pong
  // between two open jobs forever (switching costs no time).
  if (state.character.job.id === null) {
    const jobs = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-do^='apply:']:not([disabled])"),
    );
    if (jobs.length > 0) {
      jobs[jobs.length - 1]?.click();
      return true;
    }
  }
  // Burn time on safe filler actions only. Life-impacting specials
  // (date, marry, have-child, divorce, enroll, quit-job) stay out of the
  // burn list: a "childless" playthrough must never trip over them.
  const BURN_SKIP = new Set([
    "date",
    "marry",
    "divorce",
    "have-child",
    "enroll-university",
    "quit-job",
  ]);
  const acts = Array.from(
    (menuPanel(root) ?? root).querySelectorAll<HTMLButtonElement>(
      "button.action:not([disabled])",
    ),
  ).filter((card) => !BURN_SKIP.has(card.dataset["do"] ?? ""));
  if (acts.length > 0) {
    acts[0]?.click();
    return true;
  }
  return false;
}

/** Plays one whole life, year by year, until the death screen appears. */
function playFullLife(root: HTMLElement, options: PlayOptions): void {
  const flags: PlayFlags = { checkedSixteen: false, checkedJobToggle: false };
  // Generous click ceiling: a life spans at most 110 years, most years
  // take two to four clicks, so 2000 leaves room without hiding a hang.
  for (let click = 0; click < 2000; click += 1) {
    if (deathScreenVisible(root)) {
      return;
    }
    if (!doAction(root, options, flags)) {
      const advance = root.querySelector<HTMLButtonElement>("[data-do='advance']");
      if (advance && !advance.disabled) {
        advance.click();
      }
    }
  }
  throw new Error("the life never ended within 2000 clicks");
}

beforeEach(() => {
  domWindow.localStorage.clear();
  // Skip the first-run welcome screen; the robot starts lives directly.
  domWindow.localStorage.setItem("life-simulator.onboarded", "1");
  document.body.innerHTML = "";
  // The app rolls its dynasty seed from Date.now(), which made these four
  // lives depend on the wall clock: a different seed meant a different
  // event history, and a life could end childless by luck. Freezing the
  // clock keeps the playtest reproducible.
  Date.now = () => Date.parse("2025-06-01T09:00:00Z");
});

afterAll(() => {
  domWindow.close();
});

describe("automated playtest (Task 4.3)", () => {
  test("four full lives: two successions, an extinct line, then a restart", async () => {
    const root = mount();
    // The rate lookup crosses several awaits (fetch rejects, cache read,
    // note assignment); spin the microtask queue until it settles.
    for (let tick = 0; tick < 10; tick += 1) {
      await Promise.resolve();
    }
    startLife(root, "อาคิ", "สโตน", "male");

    // HUD shows BTC with four decimals; the network is down, so the
    // fallback price note lands on the more tab (moved off the HUD in
    // Phase 5) and must be readable there from the very first year.
    expect(root.querySelector(".hud")?.textContent).toMatch(/\d+\.\d{4} BTC/);
    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    expect(root.textContent).toContain("ออฟไลน์");
    root.querySelector<HTMLButtonElement>("[data-do='tab:life']")?.click();
    playFullLife(root, { seekFamily: true, childrenGoal: 2 });

    // Life 1 leaves children: the succession offers an heir.
    const life1 = savedState();
    expect(life1?.character.alive).toBe(false);
    expect(life1?.character.family.children.length).toBeGreaterThanOrEqual(1);
    // Children carry the father's surname (male founder keeps his).
    const child = life1?.character.family.children[0];
    expect(child?.familyName).toBe(life1?.character.familyName);

    root.querySelector<HTMLButtonElement>("[data-do='open-succession']")?.click();
    expect(root.textContent).toContain("เกิดใหม่เป็น");
    root.querySelector<HTMLButtonElement>("[data-do='rebirth']")?.click();
    expect(root.textContent).toContain("รุ่นที่ 2");

    // Life 2 plays to its end and hands over again.
    playFullLife(root, { seekFamily: true, childrenGoal: 2 });
    root.querySelector<HTMLButtonElement>("[data-do='open-succession']")?.click();
    root.querySelector<HTMLButtonElement>("[data-do='rebirth']")?.click();
    expect(root.textContent).toContain("รุ่นที่ 3");

    // Life 3 lives alone. The time-skip simulation (ADR 0011) grows middle
    // generations, so the played heir may already have relatives in the
    // tree: a childless life ends the dynasty only when this branch has no
    // one left. Keep rebirthing childless heirs until the line truly runs
    // out; the cap only guards against a pathological seed.
    let childlessLives = 0;
    playFullLife(root, { seekFamily: false, childrenGoal: 0 });
    while (root.querySelector("[data-do='open-succession']") && childlessLives < 20) {
      root.querySelector<HTMLButtonElement>("[data-do='open-succession']")?.click();
      root.querySelector<HTMLButtonElement>("[data-do='rebirth']")?.click();
      playFullLife(root, { seekFamily: false, childrenGoal: 0 });
      childlessLives += 1;
    }
    root.querySelector<HTMLButtonElement>("[data-do='open-gameover']")?.click();
    expect(root.textContent).toContain("ตระกูลสิ้นสุดลง");

    // The only wipe path: restart arms on the first tap, wipes on the
    // second, and lands on a clean birth setup.
    const restart = () => root.querySelector<HTMLButtonElement>("[data-do='restart']");
    restart()?.click();
    expect(readSave()).not.toBeNull();
    restart()?.click();
    expect(root.querySelector("#birth-setup")).not.toBeNull();
    expect(readSave()).toBeNull();
  }, 180_000);

  test("a female life: his surname on marriage, childless end, file round trip", async () => {
    // The file reader is async; every import assertion waits two ticks.
    const flush = async (): Promise<void> => {
      await Promise.resolve();
      await Promise.resolve();
    };
    const root = mount();
    startLife(root, "ไอริส", "เวลล์", "female");

    // Save file round trip while alive, through the more menu buttons.
    for (let year = 0; year < 3; year += 1) {
      root.querySelector<HTMLButtonElement>("[data-do='advance']")?.click();
    }
    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    root.querySelector<HTMLButtonElement>("[data-do='export-save']")?.click();
    expect(root.textContent).toContain("สำรองบันทึกลงไฟล์แล้ว");
    const snapshot = readSave() ?? "";

    const input = root.querySelector<HTMLInputElement>("#save-file-input");
    Object.defineProperty(input, "files", {
      value: [new domWindow.File([snapshot], "save.json")],
      configurable: true,
    });
    input?.dispatchEvent(new domWindow.Event("change", { bubbles: true }) as unknown as Event);
    await flush();
    expect(root.textContent).toContain("โหลดบันทึกจากไฟล์แล้ว");

    // A foreign file is rejected and the play continues untouched. The
    // import re-rendered onto the act tab, so the picker needs a re-query.
    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    const picker = root.querySelector<HTMLInputElement>("#save-file-input");
    Object.defineProperty(picker, "files", {
      value: [new domWindow.File(['{"hello":"world"}'], "photo.png")],
      configurable: true,
    });
    picker?.dispatchEvent(new domWindow.Event("change", { bubbles: true }) as unknown as Event);
    await flush();
    expect(root.textContent).toContain("ไฟล์นี้ไม่ใช่บันทึกของเกม");
    root.querySelector<HTMLButtonElement>("[data-do='tab:life']")?.click();

    // Marry but stay childless: the surname must become the husband's.
    playFullLife(root, { seekFamily: true, childrenGoal: 0 });
    const dead = savedState();
    expect(dead?.character.alive).toBe(false);
    expect(dead?.character.family.married).toBe(true);
    expect(dead?.character.family.children).toHaveLength(0);
    expect(dead?.character.familyName).toBe(dead?.character.family.partner?.familyName);

    // Married but childless still ends the dynasty.
    root.querySelector<HTMLButtonElement>("[data-do='open-gameover']")?.click();
    expect(root.textContent).toContain("ตระกูลสิ้นสุดลง");
  }, 180_000);
});
