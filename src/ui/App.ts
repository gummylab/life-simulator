import { html, nothing, render, type TemplateResult } from "lit";
import { Game, type YearResult } from "../core/Game";
import { createLife } from "../core/GameFactory";
import { BtcPrice } from "../core/economy/BtcPrice";
import type { Gender } from "../core/model/Character";
import type { BirthSetup } from "../core/model/BirthSetup";
import { SeededRng } from "../core/rng/SeededRng";
import { deserializeGame, serializeGame } from "../core/save/SaveManager";
import { ACTIONS } from "../content/actions";
import { randomNameFor } from "../content/world";
import { DEATH_CAUSE_LABELS } from "../content/deathCauses";
import { FALLBACK_RATE_USD, resolveBtcQuote } from "../infra/CoinGecko";
import { clearSave, persistSave, readSave } from "../infra/localSave";
import { BirthSetupView } from "./BirthSetupView";
import { HudView } from "./HudView";
import { LifeSummaryView } from "./LifeSummaryView";
import { MenuView } from "./MenuView";
import { OnboardingView } from "./OnboardingView";
import { TimelineView } from "./TimelineView";
import { icon, type IconName } from "./icons";

/** The market can move while a session is open. */
const RATE_REFRESH_MS = 5 * 60 * 1000;

/** The three thumb-reachable screens behind the bottom nav. */
type Tab = "act" | "log" | "more";

const TABS: readonly { id: Tab; label: string; iconName: IconName }[] = [
  { id: "act", label: "กิจกรรม", iconName: "Gamepad2" },
  { id: "log", label: "บันทึก", iconName: "ScrollText" },
  { id: "more", label: "อื่นๆ", iconName: "Menu" },
];

/** Phone-bar clock, only visible inside the desktop phone frame. */
const CLOCK = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Presentation layer. It only reads GameState, renders whole views from it
 * and forwards clicks to Game. No game rule lives here.
 * Rendering goes through lit-html: the same view classes as before now
 * return templates instead of HTML strings, so escaping and DOM diffing
 * are handled by the library.
 */
export class App {
  private game: Game | null = null;
  /** Built once per dynasty, from the rate the market had at that moment. */
  private price: BtcPrice | null = null;
  private pendingRateUsd: number | null = null;
  private rateNote = "กำลังดึงราคา BTC";
  /** Short toast shown after the year changes, cleared on a timer. */
  private notice = "";
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Which bottom-nav screen is open. */
  private tab: Tab = "act";

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    const resumed = deserializeGame(readSave() ?? "");
    if (resumed) {
      this.game = new Game(resumed.state);
      this.pendingRateUsd = resumed.baseRateUsd;
      this.price = new BtcPrice(
        resumed.baseRateUsd,
        resumed.state.character.birthYear,
        resumed.state.seed,
      );
      this.render();
    } else {
      this.renderSetup();
    }
    void this.refreshRate();
    window.setInterval(() => void this.refreshRate(), RATE_REFRESH_MS);
  }

  /** New dynasty always starts from the setup screen. */
  private renderSetup(): void {
    this.game = null;
    this.price = null;
    this.tab = "act";
    const body = html`<main class="content">${new BirthSetupView().render()}</main>`;
    render(this.deviceTemplate(body), this.root);
  }

  /** Full re-render from state keeps every view consistent after a click. */
  private render(): void {
    const game = this.game;
    if (!game) {
      return;
    }
    render(this.deviceTemplate(this.gameScreen(game)), this.root);
  }

  /**
   * Phone frame around every screen. On desktop the frame and its fake
   * status bar show; on a real phone the media query hides the bar and
   * lets the screen fill the display.
   */
  private deviceTemplate(body: TemplateResult): TemplateResult {
    return html`
      <div class="device">
        <div class="device-bar" aria-hidden="true">
          <span class="device-time">${CLOCK.format(new Date())}</span>
          <span class="device-icons">${icon("Wifi", 14)}${icon("BatteryFull", 15)}</span>
        </div>
        <div class="screen" @click=${this.onCommand} @submit=${this.onSubmit}>${body}</div>
      </div>
    `;
  }

  /** HUD, toast, the active tab's panel and the bottom dock. */
  private gameScreen(game: Game): TemplateResult {
    const state = game.gameState;
    const character = state.character;
    const rateUsd = this.price?.rateForYear(state.year) ?? FALLBACK_RATE_USD;
    // The how-to only greets the very first moments of a brand new life.
    const firstMoments = state.history.length === 0 ? new OnboardingView().render() : nothing;

    let tabContent: TemplateResult;
    if (this.tab === "log") {
      tabContent = new TimelineView(state.history).render();
    } else if (this.tab === "more") {
      // Future save export/import buttons land on this tab (Task 3.5).
      tabContent = new OnboardingView("วิธีเล่น").render();
    } else if (character.alive) {
      const menu = new MenuView(
        game.availableActions(ACTIONS).map((action) => ({
          action,
          reason: game.actionBlockReason(action),
        })),
      );
      tabContent = html`${firstMoments}${menu.render()}`;
    } else {
      tabContent = new LifeSummaryView(character, state.year, rateUsd).render();
    }

    return html`
      ${new HudView(
        character,
        state.year,
        game.age,
        state.timeLeft,
        game.timeBudget,
        rateUsd,
        this.rateNote,
      ).render()}
      ${this.notice
        ? html`<div class="toast" role="status">${icon("Info", 16)}<span>${this.notice}</span></div>`
        : nothing}
      <main class="content">${tabContent}</main>
      <footer class="dock">
        ${character.alive
          ? html`<button type="button" class="advance" data-do="advance">
              ${icon("FastForward", 18)}<span>อายุ +1 ปี</span>
            </button>`
          : nothing}
        <nav class="tabs" aria-label="เมนูหลัก">
          ${TABS.map(
            (tab) => html`
              <button
                type="button"
                class="tab"
                data-do=${`tab:${tab.id}`}
                aria-current=${this.tab === tab.id ? "page" : nothing}
              >
                ${icon(tab.iconName, 20)}<span>${tab.label}</span>
              </button>
            `,
          )}
        </nav>
      </footer>
    `;
  }

  /**
   * One click listener for the whole screen. Interactive elements carry
   * data-do, so views never need their own wiring after each re-render.
   */
  private readonly onCommand = (event: Event): void => {
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-do]");
    const command = target?.dataset.do;
    if (command) {
      this.handle(command);
    }
  };

  /** Birth setup form submit, caught by the same screen listener. */
  private readonly onSubmit = (event: Event): void => {
    const form = event.target as HTMLElement | null;
    if (form?.id === "birth-setup") {
      event.preventDefault();
      this.submitSetup();
    }
  };

  private handle(command: string): void {
    // Tab switches only move the camera; no game state changes.
    if (command.startsWith("tab:")) {
      this.tab = command.slice(4) as Tab;
      this.render();
      return;
    }

    // Birth setup button; the form exists before any game does.
    if (command === "random-name") {
      this.fillRandomNames();
      return;
    }

    const game = this.game;
    if (!game) {
      return;
    }

    if (command === "restart") {
      clearSave();
      this.renderSetup();
      return;
    }

    const yearBefore = game.gameState.year;

    if (command === "advance") {
      this.recordDeath(game.advanceYear());
    } else {
      const action = ACTIONS.find((candidate) => candidate.id === command);
      if (action) {
        const outcome = game.performAction(action);
        // An action can end the year when it empties the time budget.
        if (outcome.accepted && outcome.yearEnded !== null) {
          this.recordDeath(outcome.yearEnded);
        }
      }
    }

    // A silent year jump feels like a glitch, so announce it briefly.
    if (game.gameState.year !== yearBefore && game.character.alive) {
      this.showNotice(`ปี ${yearBefore} จบแล้ว เข้าสู่ปี ${game.gameState.year} ที่อายุ ${game.age} ปี`);
    }
    this.persist();
    this.render();
  }

  /** Parks the run in storage after every click so a refresh loses nothing. */
  private persist(): void {
    const game = this.game;
    if (game) {
      persistSave(serializeGame(game.gameState, this.price?.base ?? FALLBACK_RATE_USD));
    }
  }

  private showNotice(text: string): void {
    this.notice = text;
    if (this.noticeTimer !== null) {
      clearTimeout(this.noticeTimer);
    }
    this.noticeTimer = setTimeout(() => {
      this.notice = "";
      this.render();
    }, 3000);
  }

  /** Death gets its own timeline line, whoever ended the year. */
  private recordDeath(result: YearResult): void {
    if (result.died && result.cause) {
      this.game?.gameState.record(
        `เสียชีวิตเมื่ออายุ ${result.age} ปี (${DEATH_CAUSE_LABELS[result.cause]})`,
      );
    }
  }

  private setupRng(): SeededRng {
    return new SeededRng(Date.now() % 2147483647);
  }

  /** Rolls names for the gender currently selected. */
  private fillRandomNames(): void {
    const name = randomNameFor(this.setupRng(), this.setupGender());
    this.setInputValue("given-name", name.givenName);
    this.setInputValue("family-name", name.familyName);
  }

  /** Empty fields fall back to rolled names so a life always has a name. */
  private submitSetup(): void {
    const rng = this.setupRng();
    const fallback = randomNameFor(rng, this.setupGender());

    const setup: BirthSetup = {
      givenName: this.inputValue("given-name") || fallback.givenName,
      familyName: this.inputValue("family-name") || fallback.familyName,
      gender: this.setupGender(),
    };

    const seed = Date.now() % 2147483647;
    const birthYear = new Date().getFullYear();
    this.game = createLife(setup, seed, birthYear);
    this.price = new BtcPrice(this.pendingRateUsd ?? FALLBACK_RATE_USD, birthYear, seed);
    this.persist();
    this.render();
  }

  /** Pulls the live rate, falls back to cache, then to a fixed estimate. */
  private async refreshRate(): Promise<void> {
    const quote = await resolveBtcQuote();
    this.pendingRateUsd = quote.rateUsd;
    this.rateNote = quote.note;

    const game = this.game;
    if (!game) {
      return;
    }

    const state = game.gameState;
    // Once years have passed, the dynasty keeps the rate it was born with.
    if (state.year === state.character.birthYear) {
      this.price = new BtcPrice(quote.rateUsd, state.character.birthYear, state.seed);
    }
    this.render();
  }

  /** Reads the checked gender radio, rolling one when "สุ่มให้" is picked. */
  private setupGender(): Gender {
    const selected = this.root.querySelector<HTMLInputElement>("input[name='gender']:checked");
    if (selected?.value === "female" || selected?.value === "male") {
      return selected.value;
    }
    return this.setupRng().chance(0.5) ? "female" : "male";
  }

  private inputValue(id: string): string {
    return this.root.querySelector<HTMLInputElement>(`#${id}`)?.value.trim() ?? "";
  }

  private setInputValue(id: string, value: string): void {
    const field = this.root.querySelector<HTMLInputElement>(`#${id}`);
    if (field) {
      field.value = value;
    }
  }
}
