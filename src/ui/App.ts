import { html, nothing, render, type TemplateResult } from "lit";
import { Game, type YearResult } from "../core/Game";
import { continueLife, createLife } from "../core/GameFactory";
import { planSuccession, type SuccessionPlan } from "../core/systems/SuccessionSystem";
import { BtcPrice } from "../core/economy/BtcPrice";
import type { Gender } from "../core/model/Character";
import type { BirthSetup } from "../core/model/BirthSetup";
import { SeededRng } from "../core/rng/SeededRng";
import { deserializeGame, serializeGame } from "../core/save/SaveManager";
import { ACTIONS } from "../content/actions";
import { GAME_CONTENT } from "../content/gameContent";
import { randomNameFor } from "../content/world";
import { DEATH_CAUSE_LABELS } from "../content/deathCauses";
import { FALLBACK_RATE_USD, resolveBtcQuote } from "../infra/CoinGecko";
import { clearSave, persistSave, readOnboarded, readSave, writeOnboarded } from "../infra/localSave";
import { BirthSetupView } from "./BirthSetupView";
import { CareerView } from "./CareerView";
import { GameOverView } from "./GameOverView";
import { HudView } from "./HudView";
import { LifeSummaryView } from "./LifeSummaryView";
import { MenuView } from "./MenuView";
import { MoreMenuView } from "./MoreMenuView";
import { OnboardingView } from "./OnboardingView";
import { SuccessionView } from "./SuccessionView";
import { TimelineView } from "./TimelineView";
import { YearReportView } from "./YearReportView";
import { icon, type IconName } from "./icons";

/** The market can move while a session is open. */
const RATE_REFRESH_MS = 5 * 60 * 1000;

/** The three thumb-reachable screens behind the bottom nav. */
type Tab = "act" | "log" | "more";

/** Full sub-screens opened from the more tab's menu list. */
type View = "main" | "help" | "restart" | "succession" | "gameover" | "chronicle" | "welcome";

/** Which destructive button is armed for its second confirming tap. */
type ArmedConfirm = "restart" | null;

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
  /** Sub-screen above the tab content; "main" means the tab itself. */
  private view: View = "main";
  /** Armed destructive button: wiped or confirmed on the second tap. */
  private armedConfirm: ArmedConfirm = null;
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether the jobs panel shows the out-of-reach jobs list. */
  private showAllJobs = false;
  /** Phase 5 turn-loop state: the year's news, expanded panels and flags. */
  private lastNews: readonly string[] = [];
  private statsExpanded = false;
  private showBlockedActions = false;
  private showCareer = false;

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    const resumed = deserializeGame(readSave() ?? "");
    if (resumed) {
      this.game = new Game(resumed.state, GAME_CONTENT);
      this.pendingRateUsd = resumed.baseRateUsd;
      this.price = new BtcPrice(
        resumed.baseRateUsd,
        resumed.state.character.birthYear,
        resumed.state.seed,
      );
      // A refresh mid-year should not re-badge the cards already on screen.
      this.markCurrentActionsSeen(this.game);
      // A refresh mid-succession must land back on the succession screen:
      // the plan is derived from the frozen save, so it always matches.
      if (!resumed.state.character.alive && this.successionPlan() !== null) {
        this.view = "succession";
      }
      this.render();
    } else if (!readOnboarded()) {
      // First visit, no save yet: teach before the birth setup appears.
      this.view = "welcome";
      render(
        this.deviceTemplate(html`<main class="content">
          ${new OnboardingView("welcome").render()}
        </main>`),
        this.root,
      );
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
    this.view = "main";
    this.showAllJobs = false;
    this.clearArmedConfirm();
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
        <div
          class="screen"
          @click=${this.onCommand}
          @submit=${this.onSubmit}
          @change=${this.onChange}
        >
          ${body}
        </div>
      </div>
    `;
  }

  /** HUD, toast, the active tab's panel and the bottom dock. */
  private gameScreen(game: Game): TemplateResult {
    const state = game.gameState;
    const character = state.character;
    const rateUsd = this.price?.rateForYear(state.year) ?? FALLBACK_RATE_USD;

    // Sub-screens fill the display: no HUD, only their own panel plus nav.
    if (this.view === "help") {
      return html`${this.toast()}
        <main class="content">${new OnboardingView().render()}</main>
        ${this.dock(character.alive, false)}`;
    }
    if (this.view === "restart") {
      const summary = new LifeSummaryView(
        state,
        rateUsd,
        this.armedConfirm === "restart",
        this.deadEndState(),
      );
      return html`${this.toast()}
        <main class="content">${summary.render()}</main>
        ${this.dock(character.alive, false)}`;
    }
    if (this.view === "succession") {
      const plan = this.successionPlan();
      const view = new SuccessionView(
        plan?.chronicle ?? state.dynasty.chronicle,
        plan,
        rateUsd,
        plan ? plan.rebirthYear - state.year : 0,
      );
      return html`${this.toast()}
        <main class="content">${view.render()}</main>
        ${this.dock(character.alive, false)}`;
    }
    if (this.view === "gameover") {
      const view = new GameOverView(state, rateUsd, this.armedConfirm === "restart");
      return html`${this.toast()}
        <main class="content">${view.render()}</main>
        ${this.dock(character.alive, false)}`;
    }
    if (this.view === "chronicle") {
      const view = new SuccessionView(state.dynasty.chronicle, null, rateUsd, 0);
      return html`${this.toast()}
        <main class="content">${view.render()}</main>
        ${this.dock(character.alive, false)}`;
    }

    let tabContent: TemplateResult;
    if (this.tab === "log") {
      tabContent = new TimelineView(state.history).render();
    } else if (this.tab === "more") {
      tabContent = new MoreMenuView(
        state.dynasty.chronicle.length,
        rateUsd,
        this.rateNote,
      ).render();
    } else if (character.alive) {
      // Turn-loop order (ADR 0012): year report, then the decision menu,
      // then the jobs panel collapsed to one status row unless a job is
      // actually open to apply for.
      const menuEntries = game.availableActions(ACTIONS).map((action) => ({
        action,
        reason: game.actionBlockReason(action),
      }));
      tabContent = html`
        ${new YearReportView(state.year, this.lastNews).render()}
        ${new MenuView(menuEntries, rateUsd, game.seenActions, this.showBlockedActions).render()}
        ${this.careerTemplate(game, rateUsd)}
      `;
    } else {
      tabContent = new LifeSummaryView(
        state,
        rateUsd,
        this.armedConfirm === "restart",
        this.deadEndState(),
      ).render();
    }

    // The HUD belongs to the action tab only; the other tabs read full height.
    const hud =
      this.tab === "act"
        ? new HudView(
            character,
            state.year,
            game.age,
            state.timeLeft,
            game.timeBudget,
            rateUsd,
            game.stageLabel(),
            this.statsExpanded,
          ).render()
        : nothing;

    return html`
      ${hud}${this.toast()}
      <main class="content">${tabContent}</main>
      ${this.dock(character.alive, this.tab !== "more")}
    `;
  }

  /** Transient note after the year changes, floating above the dock. */
  private toast(): TemplateResult | typeof nothing {
    return this.notice
      ? html`<div class="toast" role="status">${icon("Info", 16)}<span>${this.notice}</span></div>`
      : nothing;
  }

  /**
   * The jobs block on the act tab (Phase 5): the full panel while at
   * least one job is open to apply for (the actionable moment deserves
   * the space), otherwise a one-line status row the player can tap to
   * expand. Hidden entirely until the youngest job's age, as before.
   */
  private careerTemplate(game: Game, rateUsd: number): TemplateResult {
    const content = game.gameContent;
    const character = game.character;
    if (!content || content.jobs.length === 0) {
      return html``;
    }
    const youngest = Math.min(...content.jobs.map((job) => job.minAge));
    if (character.job.id === null && game.age < youngest) {
      return html``;
    }
    const hasOpenJob = content.jobs.some(
      (job) => job.id !== character.job.id && game.jobBlockReason(job) === null,
    );
    const view = new CareerView(game, rateUsd, this.showAllJobs);
    return this.showCareer || hasOpenJob ? view.render() : view.statusRow();
  }

  /** Year button (main tab screens only) above the always-visible nav. */
  private dock(alive: boolean, showAdvance: boolean): TemplateResult {
    const game = this.game;
    const timeLeft = game?.gameState.timeLeft ?? 0;
    return html`
      <footer class="dock">
        ${alive && showAdvance
          ? html`<button type="button" class="advance" data-do="advance">
              ${icon("FastForward", 18)}<span>อายุ +1 ปี</span>
              ${timeLeft > 0
                ? html`<span class="advance-hint">ยังใช้เวลาไม่หมด (${timeLeft})</span>`
                : nothing}
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
      this.view = "main";
      this.render();
      return;
    }

    // More tab sub-screens: how-to, farewell, family record, end state.
    if (
      command === "open-help" ||
      command === "open-restart" ||
      command === "open-succession" ||
      command === "open-gameover" ||
      command === "open-chronicle"
    ) {
      if (command === "open-help") {
        this.view = "help";
      } else if (command === "open-restart") {
        this.view = "restart";
      } else if (command === "open-succession" || command === "open-chronicle") {
        this.view = command === "open-succession" ? "succession" : "chronicle";
      } else {
        this.view = "gameover";
      }
      this.render();
      return;
    }

    if (command === "back") {
      this.view = "main";
      this.render();
      return;
    }

    // Birth setup button; the form exists before any game does.
    if (command === "random-name") {
      this.fillRandomNames();
      return;
    }
    // Welcome screen's start button (first visit only, no game yet).
    if (command === "welcome-done") {
      writeOnboarded();
      this.renderSetup();
      return;
    }

    const game = this.game;
    if (!game) {
      return;
    }

    if (command === "copy-bio") {
      void this.copyBiography();
      return;
    }

    // The heir takes over: succession needs no confirm, it loses nothing.
    if (command === "rebirth") {
      const plan = this.successionPlan();
      if (plan) {
        this.game = continueLife(plan, game.gameState, GAME_CONTENT);
        this.tab = "act";
        this.view = "main";
        this.markCurrentActionsSeen(this.game);
        this.persist();
        // Notice first: the render below picks the toast up.
        this.showNotice(
          `เกิดใหม่เป็น ${plan.heir.givenName} ${plan.heir.familyName} รุ่นที่ ${plan.newGeneration}`,
        );
        this.render();
      }
      return;
    }

    // Save management (Task 3.5): download, restore from file, or wipe.
    if (command === "export-save") {
      this.exportSave();
      return;
    }
    if (command === "import-save") {
      this.root.querySelector<HTMLInputElement>("#save-file-input")?.click();
      return;
    }

    // Wiping the save needs a second tap; "เริ่มใหม่" is the single path.
    if (command === "restart") {
      if (this.armedConfirm !== command) {
        this.armConfirm(command);
        return;
      }
      this.clearArmedConfirm();
      clearSave();
      this.renderSetup();
      return;
    }

    // Turn-loop panel toggles (Phase 5): stat strip, blocked cards, jobs row.
    if (
      command === "toggle-stats" ||
      command === "toggle-blocked" ||
      command === "toggle-career"
    ) {
      if (command === "toggle-stats") {
        this.statsExpanded = !this.statsExpanded;
      } else if (command === "toggle-blocked") {
        this.showBlockedActions = !this.showBlockedActions;
      } else {
        this.showCareer = !this.showCareer;
      }
      this.render();
      return;
    }

    // Career commands come from the jobs panel, not the action list.
    if (command === "toggle-jobs") {
      this.showAllJobs = !this.showAllJobs;
      this.render();
      return;
    }
    if (command === "quit-job") {
      game.quitJob();
      // The player is looking at the panel; keep it open after the change.
      this.showCareer = true;
      this.persist();
      this.render();
      return;
    }
    if (command.startsWith("apply:")) {
      const spec = GAME_CONTENT.jobs.find((job) => job.id === command.slice(6));
      if (spec) {
        game.applyForJob(spec);
      }
      // The player is looking at the panel; keep it open after the change.
      this.showCareer = true;
      this.persist();
      this.render();
      return;
    }

    const yearBefore = game.gameState.year;
    // Snapshot what the ending year offered so its cards stop being "ใหม่".
    const visibleBefore = game.availableActions(ACTIONS).map((action) => action.id);

    let news: readonly string[] = [];
    if (command === "advance") {
      const result = game.advanceYear();
      news = result.news;
      this.recordDeath(result);
    } else {
      const action = ACTIONS.find((candidate) => candidate.id === command);
      if (action) {
        const outcome = game.performAction(action);
        // An action can end the year when it empties the time budget.
        if (outcome.accepted && outcome.yearEnded !== null) {
          news = outcome.yearEnded.news;
          this.recordDeath(outcome.yearEnded);
        }
      }
    }

    if (game.gameState.year !== yearBefore) {
      // The year that just ended has been fully seen; new badges at the
      // fresh year then mark only the cards that newly appeared.
      game.markActionsSeen(visibleBefore);
      if (game.character.alive) {
        this.lastNews = news;
        this.showNotice(
          `ปี ${yearBefore} จบแล้ว เข้าสู่ปี ${game.gameState.year} ที่อายุ ${game.age} ปี`,
        );
      }
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

  /** Copies the dead character's biography to the clipboard. */
  private async copyBiography(): Promise<void> {
    const game = this.game;
    if (!game) {
      return;
    }
    const rateUsd = this.price?.rateForYear(game.gameState.year) ?? FALLBACK_RATE_USD;
    const text = new LifeSummaryView(game.gameState, rateUsd).biographyText();
    try {
      await navigator.clipboard.writeText(text);
      this.showNotice("คัดลอกชีวประวัติแล้ว");
    } catch {
      this.showNotice("คัดลอกไม่สำเร็จ ลองคัดลอกมือ");
    }
    this.render();
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

  /** First tap arms a destructive button; it disarms itself in three seconds. */
  private armConfirm(command: Exclude<ArmedConfirm, null>): void {
    this.armedConfirm = command;
    if (this.confirmTimer !== null) {
      clearTimeout(this.confirmTimer);
    }
    this.confirmTimer = setTimeout(() => {
      this.armedConfirm = null;
      this.render();
    }, 3000);
    this.render();
  }

  private clearArmedConfirm(): void {
    this.armedConfirm = null;
    if (this.confirmTimer !== null) {
      clearTimeout(this.confirmTimer);
      this.confirmTimer = null;
    }
  }

  /**
   * The pending succession of a dead character, or null while alive or
   * when no descendant carries the line. Seeded from the saved rng state,
   * so every render and a refresh after saving all show the same heir.
   */
  private successionPlan(): SuccessionPlan | null {
    const state = this.game?.gameState;
    if (!state || state.character.alive) {
      return null;
    }
    return planSuccession(state, GAME_CONTENT, new SeededRng(state.rngState));
  }

  /** What the death screen offers next: the heir, or the dynasty's end. */
  private deadEndState(): "heir" | "extinct" | null {
    const state = this.game?.gameState;
    if (!state || state.character.alive) {
      return null;
    }
    return this.successionPlan() !== null ? "heir" : "extinct";
  }

  /**
   * Downloads the current save as a JSON file. The serialized payload is
   * exactly what the autosave holds, so an import can restore it as is.
   */
  private exportSave(): void {
    const game = this.game;
    if (!game) {
      return;
    }
    try {
      const json = serializeGame(game.gameState, this.price?.base ?? FALLBACK_RATE_USD);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `life-simulator-${game.gameState.year}.json`;
      link.click();
      URL.revokeObjectURL(url);
      this.showNotice("สำรองบันทึกลงไฟล์แล้ว");
    } catch {
      this.showNotice("สำรองไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
    this.render();
  }

  /**
   * Replaces the run with a chosen save file. Files that fail to parse
   * or carry a foreign version are rejected with a note instead of
   * clobbering the autosave.
   */
  private readonly onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement | null;
    if (input?.id !== "save-file-input") {
      return;
    }
    const file = input.files?.[0];
    // Let the same file be picked again after a failed import.
    input.value = "";
    if (file) {
      void this.importSaveFile(file);
    }
  };

  private async importSaveFile(file: File): Promise<void> {
    let imported: ReturnType<typeof deserializeGame> = null;
    try {
      imported = deserializeGame(await file.text());
    } catch {
      imported = null;
    }
    if (!imported) {
      this.showNotice("ไฟล์นี้ไม่ใช่บันทึกของเกม");
      this.render();
      return;
    }
    this.game = new Game(imported.state, GAME_CONTENT);
    this.pendingRateUsd = imported.baseRateUsd;
    this.price = new BtcPrice(
      imported.baseRateUsd,
      imported.state.character.birthYear,
      imported.state.seed,
    );
    this.tab = "act";
    this.view =
      !imported.state.character.alive && this.successionPlan() !== null
        ? "succession"
        : "main";
    this.persist();
    this.render();
    this.showNotice("โหลดบันทึกจากไฟล์แล้ว");
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
    this.game = createLife(setup, seed, birthYear, GAME_CONTENT);
    this.price = new BtcPrice(this.pendingRateUsd ?? FALLBACK_RATE_USD, birthYear, seed);
    // The opening menu is baseline, not news: badges start at the first
    // milestone that unlocks later (e.g. the cafe at age 6).
    this.markCurrentActionsSeen(this.game);
    this.persist();
    this.render();
  }

  /** Marks every action currently offered as seen, for the "ใหม่" badges. */
  private markCurrentActionsSeen(game: Game): void {
    const ids = game.availableActions(ACTIONS).map((action) => action.id);
    game.markActionsSeen(ids);
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
