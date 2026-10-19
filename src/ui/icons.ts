import { html, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { IconNode } from "lucide";
import type { StatKey } from "../core/model/StatBlock";
import {
  BatteryFull,
  Baby,
  Blocks,
  BookHeart,
  BookOpen,
  Briefcase,
  Brain,
  Cake,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleHelp,
  Clock,
  Coins,
  Copy,
  Dumbbell,
  Download,
  FastForward,
  Film,
  Gamepad2,
  Gem,
  GraduationCap,
  Hand,
  Heart,
  Hourglass,
  Info,
  ListChecks,
  Menu,
  Moon,
  Newspaper,
  Plane,
  RefreshCw,
  ScrollText,
  Skull,
  Smile,
  Sparkles,
  Tv,
  Unlink,
  Upload,
  User,
  Wifi,
  Zap,
  Laptop2,
} from "lucide";

/**
 * Lucide icon registry for the UI layer.
 *
 * Icons are imported one by one so the bundler only ships what the game
 * uses. The vanilla `icons` bundle (every icon in the library) is kept out
 * of the app on purpose. Rendering goes through unsafeHTML with markup we
 * build ourselves from the library's icon nodes: the HTML parser puts
 * <svg> subtrees in the SVG namespace, so the result is a real SVG element
 * and lit can diff it like any other node.
 */
export const ICON_SET = {
  BatteryFull,
  Baby,
  Blocks,
  BookHeart,
  BookOpen,
  Briefcase,
  Brain,
  Cake,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleHelp,
  Clock,
  Coins,
  Copy,
  Dumbbell,
  Download,
  FastForward,
  Film,
  Gamepad2,
  Gem,
  GraduationCap,
  Hand,
  Heart,
  Hourglass,
  Info,
  ListChecks,
  Menu,
  Moon,
  Newspaper,
  Plane,
  RefreshCw,
  ScrollText,
  Skull,
  Smile,
  Sparkles,
  Tv,
  Unlink,
  Upload,
  User,
  Wifi,
  Zap,
  Laptop2,
} as const satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICON_SET;

/** One icon per life stat, so the HUD bars read at a glance. */
export const STAT_ICONS: Readonly<Record<StatKey, IconName>> = {
  health: "Heart",
  happiness: "Smile",
  smarts: "Brain",
  looks: "Sparkles",
};

/**
 * Icon per action id. Kept here instead of content/actions.ts so the game
 * core stays free of UI concerns; the test asserts full coverage of ACTIONS.
 */
export const ACTION_ICONS: Readonly<Record<string, IconName>> = {
  toys: "Blocks",
  story: "BookHeart",
  rest: "Tv",
  sleep: "Moon",
  "cafe-movie": "Film",
  massage: "Hand",
  trip: "Plane",
  study: "BookOpen",
  exercise: "Dumbbell",
  "part-time": "Briefcase",
  freelance: "Laptop2",
  "enroll-university": "GraduationCap",
  date: "Heart",
  marry: "Gem",
  divorce: "Unlink",
  "have-child": "Baby",
};

function escapeAttr(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
}

/** Serializes one lucide icon node tree into SVG fragment markup. */
function childrenMarkup(node: IconNode): string {
  return node
    .map(([tag, attrs]) => {
      const pairs = Object.entries(attrs)
        .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
        .join(" ");
      return `<${tag} ${pairs}/>`;
    })
    .join("");
}

/** Full SVG markup for an icon; unknown names fall back to a plain circle. */
export function iconMarkup(name: IconName, size = 18): string {
  const node = ICON_SET[name] ?? Circle;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" class="icon" ` +
    `aria-hidden="true" focusable="false">${childrenMarkup(node)}</svg>`
  );
}

/** Icon as a lit template, safe to drop into any html template. */
export function icon(name: IconName, size = 18): TemplateResult {
  return html`${unsafeHTML(iconMarkup(name, size))}`;
}

/** Icon for an action id, falling back to a circle for content the map
 *  does not know yet (future phases add actions regularly). */
export function iconForAction(id: string): IconName {
  return ACTION_ICONS[id] ?? "Circle";
}

export function actionIcon(id: string): TemplateResult {
  return icon(iconForAction(id));
}
