import { Game, type YearResult } from "../core/Game";
import { createLife } from "../core/GameFactory";
import { BtcPrice } from "../core/economy/BtcPrice";
import type { Gender } from "../core/model/Character";
import type { BirthSetup } from "../core/model/BirthSetup";
import { SeededRng } from "../core/rng/SeededRng";
import { ACTIONS } from "../content/actions";
import { randomNameFor } from "../content/world";
import { DEATH_CAUSE_LABELS } from "../content/deathCauses";
import { FALLBACK_RATE_USD, resolveBtcQuote } from "../infra/CoinGecko";
import { BirthSetupView } from "./BirthSetupView";
import { HudView } from "./HudView";
import { LifeSummaryView } from "./LifeSummaryView";
import { MenuView } from "./MenuView";
import { TimelineView } from "./TimelineView";

/** The market can move while a session is open. */
const RATE_REFRESH_MS = 5 * 60 * 1000;

/**
 * Presentation layer. It only reads GameState, renders whole views from it
 * and forwards clicks to Game. No game rule lives here.
 */
export class App {
  private game: Game | null = null;
  /** Built once per dynasty, from the rate the market had at that moment. */
  private price: BtcPrice | null = null;
  private pendingRateUsd: number | null = null;
  private rateNote = "กำลังดึงราคา BTC";

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    this.renderSetup();
    void this.refreshRate();
    window.setInterval(() => void this.refreshRate(), RATE_REFRESH_MS);
  }

  /** New dynasty always starts from the setup screen. */
  private renderSetup(): void {
    this.game = null;
    this.price = null;
    this.root.innerHTML = new BirthSetupView().render();
    this.bindSetupEvents();
  }

  private bindSetupEvents(): void {
    this.root
      .querySelector<HTMLButtonElement>("[data-do='random-name']")
      ?.addEventListener("click", () => this.fillRandomNames());

    this.root
      .querySelector<HTMLFormElement>("#birth-setup")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        this.submitSetup();
      });
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

  /** Full re-render from state keeps every view consistent after a click. */
  private render(): void {
    const game = this.game;
    if (!game) {
      return;
    }

    const state = game.gameState;
    const character = state.character;
    const rateUsd = this.price?.rateForYear(state.year) ?? FALLBACK_RATE_USD;
    const summary = character.alive
      ? new MenuView(
          game.availableActions(ACTIONS).map((action) => ({
            action,
            reason: game.actionBlockReason(action),
          })),
        ).render()
      : new LifeSummaryView(character, state.year, rateUsd).render();

    this.root.innerHTML = [
      new HudView(
        character,
        state.year,
        game.age,
        state.timeLeft,
        game.timeBudget,
        rateUsd,
        this.rateNote,
      ).render(),
      summary,
      new TimelineView(state.history).render(),
    ].join("");

    this.bindGameEvents();
  }

  private bindGameEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-do]").forEach((button) => {
      button.addEventListener("click", () => this.handle(button.dataset.do ?? ""));
    });
  }

  private handle(command: string): void {
    const game = this.game;
    if (!game) {
      return;
    }

    if (command === "restart") {
      this.renderSetup();
      return;
    }

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

    this.render();
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
