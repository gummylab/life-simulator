import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { App } from "../src/ui/App";
import { domWindow } from "./setup-dom";
import { GameState } from "../src/core/model/GameState";
import { Character } from "../src/core/model/Character";
import type { Person } from "../src/core/model/Person";
import { deserializeGame, serializeGame } from "../src/core/save/SaveManager";
import { persistSave, readSave } from "../src/infra/localSave";

/**
 * End-to-end flow of Task 3.4 and 3.5 on happy-dom: death offers the
 * succession, the chronicle hands over to the heir, a childless line
 * shows the dynasty's final stats, and the save file round-trips
 * through export and import.
 */

function mount(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  new App(root).start();
  return root;
}

/** A dead founder with one child, so the plan always finds an heir. */
function deadFounderSave(withChild: boolean): void {
  const character = new Character({
    givenName: "อีธาน",
    familyName: "มิลเลอร์",
    gender: "male",
    birthYear: 1948,
    maxLifespan: 78,
    money: 0.4,
  });
  if (withChild) {
    character.family.children.push({
      id: `${character.id}.1`,
      givenName: "ลีแอม",
      familyName: "มิลเลอร์",
      gender: "male",
      birthYear: 1975,
      parentId: character.id,
    } as Person);
  }
  character.die("oldAge");

  const state = new GameState({
    year: 2026,
    seed: 9,
    rngState: 9,
    character,
    founderFamilyName: "มิลเลอร์",
    timeLeft: 0,
  });
  persistSave(serializeGame(state, 100_000));
}

beforeEach(() => {
  domWindow.localStorage.clear();
  document.body.innerHTML = "";
});

afterAll(() => {
  domWindow.close();
});

describe("succession flow", () => {
  test("a refresh mid-succession lands back on the succession screen", () => {
    deadFounderSave(true);

    const root = mount();
    // Resuming a saved death with a living heir skips straight to the hand-off.
    expect(root.textContent).toContain("บันทึกตระกูล");
    expect(root.querySelector("[data-do='rebirth']")).not.toBeNull();
    expect(root.querySelector(".hud")).toBeNull();
  });

  test("the heir takes over: rebirth starts generation 2 at the jump year", () => {
    deadFounderSave(true);
    const root = mount();

    const heirLine = root.querySelector("[data-do='rebirth']")?.textContent ?? "";
    expect(heirLine).toContain("เกิดใหม่เป็น");
    // The chronicle already tells the story of the crossed generations.
    expect(root.textContent).toContain("แต่งงานกับ");

    root.querySelector<HTMLButtonElement>("[data-do='rebirth']")?.click();

    // The new life plays normally: HUD back, generation two in the save.
    expect(root.querySelector(".hud")).not.toBeNull();
    expect(root.textContent).toContain("รุ่นที่ 2");
    const saved = deserializeGame(readSave() ?? "");
    expect(saved?.state.dynasty.generation).toBe(2);
    expect(saved?.state.dynasty.chronicle.length).toBeGreaterThan(0);
    expect(saved?.state.character.alive).toBe(true);
    expect(saved?.state.character.familyName).toBe("มิลเลอร์");
  });

  test("a childless line offers the final stats instead of a succession", () => {
    deadFounderSave(false);

    const root = mount();
    expect(root.querySelector("[data-do='open-gameover']")).not.toBeNull();
    expect(root.querySelector("[data-do='open-succession']")).toBeNull();

    root.querySelector<HTMLButtonElement>("[data-do='open-gameover']")?.click();
    expect(root.textContent).toContain("ตระกูลสิ้นสุดลง");
    expect(root.textContent).toContain("จำนวนรุ่นที่ผ่านไป");
    expect(root.textContent).toContain("มรดกสุดท้าย");
    // The end screen keeps the only way out: the armed two-tap restart.
    const restartButton = () => root.querySelector<HTMLButtonElement>("[data-do='restart']");
    restartButton()?.click();
    expect(restartButton()?.textContent).toContain("แตะอีกครั้งเพื่อยืนยัน");
    expect(readSave()).not.toBeNull();
    restartButton()?.click();
    expect(root.querySelector("#birth-setup")).not.toBeNull();
    expect(readSave()).toBeNull();
  });

  test("the death screen still links back to the biography", () => {
    deadFounderSave(true);
    const root = mount();

    // From the succession screen the back button reaches the summary.
    root.querySelector<HTMLButtonElement>("[data-do='back']")?.click();
    expect(root.textContent).toContain("ชีวประวัติของ อีธาน มิลเลอร์");
    expect(root.querySelector("[data-do='open-succession']")).not.toBeNull();
    expect(root.querySelector("[data-do='copy-bio']")).not.toBeNull();
  });
});

describe("save export and import", () => {
  test("export downloads a JSON that imports back into the same life", async () => {
    deadFounderSave(true);
    const root = mount();

    // Capture what the download would carry instead of hitting the DOM.
    let exported: Blob | null = null;
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = ((blob: Blob) => {
      exported = blob;
      return "blob:test";
    }) as typeof URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL;
    // Read through an annotated accessor: TS cannot see through the
    // closure, so it would otherwise keep the local narrowed to null.
    const exportedBlob = (): Blob | null => exported;

    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    root.querySelector<HTMLButtonElement>("[data-do='export-save']")?.click();

    expect(root.textContent).toContain("สำรองบันทึกลงไฟล์แล้ว");
    const blob = exportedBlob();
    if (blob === null) {
      throw new Error("export captured no blob");
    }

    // The blob holds the save; import it back through the file input path.
    const json = await blob.text();
    expect(JSON.parse(json).version).toBe(1);

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;

    // Now import: replace autosave with a foreign copy and confirm restore.
    const payload = JSON.parse(json) as { character: { givenName: string } };
    payload.character.givenName = "นำเข้าแล้ว";
    const input = root.querySelector<HTMLInputElement>("#save-file-input");
    expect(input).not.toBeNull();
    const file = new domWindow.File([JSON.stringify(payload)], "save.json", {
      type: "application/json",
    });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    // Same runtime, two type identities: cast like the submit tests do.
    input?.dispatchEvent(new domWindow.Event("change", { bubbles: true }) as unknown as Event);
    await Promise.resolve();
    await Promise.resolve();

    expect(root.textContent).toContain("นำเข้าแล้ว");
    const restored = deserializeGame(readSave() ?? "");
    expect(restored?.state.character.givenName).toBe("นำเข้าแล้ว");
  });

  test("a foreign file is refused and the current run survives", async () => {
    deadFounderSave(true);
    const root = mount();
    const before = readSave();

    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();
    const input = root.querySelector<HTMLInputElement>("#save-file-input");
    const file = new domWindow.File([JSON.stringify({ hello: "world" })], "photo.png");
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input?.dispatchEvent(new domWindow.Event("change", { bubbles: true }) as unknown as Event);
    await Promise.resolve();
    await Promise.resolve();

    expect(root.textContent).toContain("ไฟล์นี้ไม่ใช่บันทึกของเกม");
    expect(readSave()).toBe(before);
  });

  test("wiping from the more menu needs the second tap too", () => {
    deadFounderSave(true);
    const root = mount();
    root.querySelector<HTMLButtonElement>("[data-do='back']")?.click();
    root.querySelector<HTMLButtonElement>("[data-do='tab:more']")?.click();

    const deleteButton = () => root.querySelector<HTMLButtonElement>("[data-do='delete-save']");
    expect(deleteButton()).not.toBeNull();
    deleteButton()?.click();
    expect(deleteButton()?.textContent).toContain("แตะอีกครั้งเพื่อลบทุกอย่าง");
    expect(readSave()).not.toBeNull();

    deleteButton()?.click();
    expect(root.querySelector("#birth-setup")).not.toBeNull();
    expect(readSave()).toBeNull();
  });
});
