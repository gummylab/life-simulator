/**
 * Browser storage adapter for the save file.
 *
 * Everything here is allowed to fail silently: private browsing can refuse
 * storage, and a lost save is better than a crashed game.
 */

const SAVE_KEY = "life-simulator.save";

export function persistSave(json: string): void {
  try {
    localStorage.setItem(SAVE_KEY, json);
  } catch {
    // No storage available; the session simply will not resume.
  }
}

export function readSave(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Same as above: nothing to do when storage is unavailable.
  }
}
