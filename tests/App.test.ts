import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { App } from "../src/ui/App";
import { domWindow } from "./setup-dom";

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
});
