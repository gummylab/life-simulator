/**
 * Browser storage adapter for the save file.
 *
 * Everything here is allowed to fail silently: private browsing can refuse
 * storage, and a lost save is better than a crashed game.
 */

const SAVE_KEY = "life-simulator.save";
/** First-run how-to flag; lives outside the save (a player concern, not a dynasty one). */
const ONBOARDED_KEY = "life-simulator.onboarded";

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

/** Whether the how-to has been acknowledged. Unknown storage counts as yes. */
export function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return true;
  }
}

export function writeOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // Same as above: the welcome screen will simply show again.
  }
}
