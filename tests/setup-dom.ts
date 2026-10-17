import { Window } from "happy-dom";

/**
 * Preloaded before every test file (see bunfig.toml). happy-dom stands in
 * for the browser so UI modules that touch document, window or
 * localStorage when lit-html captures them at import time find real
 * objects. The game core never reads these globals, so engine tests are
 * unaffected.
 */
export const domWindow = new Window({ url: "http://localhost/" });

Object.assign(globalThis, {
  window: domWindow,
  document: domWindow.document,
  localStorage: domWindow.localStorage,
  navigator: domWindow.navigator,
  HTMLElement: domWindow.HTMLElement,
  HTMLInputElement: domWindow.HTMLInputElement,
  HTMLFormElement: domWindow.HTMLFormElement,
  Element: domWindow.Element,
  Node: domWindow.Node,
  Text: domWindow.Text,
  Comment: domWindow.Comment,
  DocumentFragment: domWindow.DocumentFragment,
});

// No test may ever reach the real network.
globalThis.fetch = (() =>
  Promise.reject(new Error("network disabled in tests"))) as unknown as typeof fetch;
