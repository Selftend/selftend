import type { Href } from "expo-router";

import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";

/**
 * The catalogue: ONE ordered array of eleven items — the eight tool hubs, then the three
 * modules — and the single referent for "catalogue order" (#1955, spec #1885 §1.1).
 *
 * Favourites is this array FILTERED, never sorted and never stored with a position: a
 * favourited item holds the same relative position it holds in the catalogue below it.
 * `/tools` renders the first eight, `/modules` the last three, Home renders all of it
 * twice over — and every one of those surfaces slices this constant, so nothing can be
 * ordered wrongly.
 *
 * It lives under the favourites feature because the array's reason to be single is the
 * filter; every other consumer only slices it.
 *
 * Tool order within the eight is free (#1610, #1861 D4) and is the order `/tools` shipped.
 * Module order is CBT, ACT, DBT. Tool labels are #1861's to change and are not folded in
 * here — the name keys are the ones the sidebar and the tool screens already share.
 */

export type ToolKey =
  "mood" | "journal" | "breathing" | "gratitude" | "grounding" | "meditation" | "sleep" | "habits";

export type ModuleKey = "cbt" | "act" | "dbt";

export type FavoriteKind = "tool" | "module";

interface ItemBase {
  href: Href;
  nameKey: string;
  subKey: string;
}

export interface ToolItem extends ItemBase {
  kind: "tool";
  key: ToolKey;
  icon: MaterialIconName;
}

export interface ModuleItem extends ItemBase {
  kind: "module";
  key: ModuleKey;
  /** The mark. It IS content (the module's name in short), so it takes `CHROME_TEXT`. */
  abbreviation: string;
}

export type CatalogueItem = ToolItem | ModuleItem;

/** A row of `public.favorites`, as the app reads it. */
export interface Favorite {
  kind: FavoriteKind;
  key: string;
}

export const TOOLS: readonly ToolItem[] = [
  {
    kind: "tool",
    key: "mood",
    href: "/tools/check-in",
    icon: "mood",
    nameKey: "today.tools.moodTracker",
    subKey: "today.tools.moodTrackerSub",
  },
  {
    kind: "tool",
    key: "journal",
    href: "/tools/journal",
    icon: "edit-note",
    nameKey: "today.tools.journal",
    subKey: "today.tools.journalSub",
  },
  {
    kind: "tool",
    key: "breathing",
    href: "/tools/breathing",
    icon: "air",
    nameKey: "today.tools.breathing",
    subKey: "today.tools.breathingSub",
  },
  {
    kind: "tool",
    key: "gratitude",
    href: "/tools/gratitude-log",
    // The heart is THIS tool's glyph — which is why the star is a star (#1888).
    icon: "favorite",
    nameKey: "today.tools.gratitudeLog",
    subKey: "today.tools.gratitudeLogSub",
  },
  {
    kind: "tool",
    key: "grounding",
    href: "/tools/grounding",
    icon: "anchor",
    nameKey: "today.tools.grounding",
    subKey: "today.tools.groundingSub",
  },
  {
    kind: "tool",
    key: "meditation",
    href: "/tools/meditation",
    icon: "self-improvement",
    nameKey: "today.tools.meditation",
    subKey: "today.tools.meditationSub",
  },
  {
    kind: "tool",
    key: "sleep",
    href: "/tools/sleep",
    icon: "bedtime",
    nameKey: "today.tools.sleep",
    subKey: "today.tools.sleepSub",
  },
  {
    kind: "tool",
    key: "habits",
    href: "/tools/habits",
    icon: "task-alt",
    nameKey: "today.tools.habits",
    subKey: "today.tools.habitsSub",
  },
];

export const MODULES: readonly ModuleItem[] = [
  {
    kind: "module",
    key: "cbt",
    href: "/modules/cbt",
    abbreviation: "CBT",
    nameKey: "today.modules.cbtName",
    subKey: "today.modules.cbtSub",
  },
  {
    kind: "module",
    key: "act",
    href: "/modules/act",
    abbreviation: "ACT",
    nameKey: "today.modules.actName",
    subKey: "today.modules.actSub",
  },
  {
    kind: "module",
    key: "dbt",
    href: "/modules/dbt",
    abbreviation: "DBT",
    nameKey: "today.modules.dbtName",
    subKey: "today.modules.dbtSub",
  },
];

/** The eleven, in catalogue order. */
export const CATALOGUE: readonly CatalogueItem[] = [...TOOLS, ...MODULES];

/** The row's identity, and the mutation scope id that serialises star/unstar on it. */
export function favoriteId(kind: FavoriteKind, key: string): string {
  return `favorite:${kind}:${key}`;
}

export function isFavorite(favorites: readonly Favorite[], kind: FavoriteKind, key: string) {
  return favorites.some((favorite) => favorite.kind === kind && favorite.key === key);
}

/**
 * The catalogue filtered to the person's rows — a FILTER, so the order is the
 * catalogue's. A row whose key the catalogue does not know is ignored on read: that is
 * what lets a future tool land without a migration and keeps a downgraded build from
 * erroring on a row it does not recognise (`key` is deliberately unconstrained in SQL).
 */
export function favoriteItems(favorites: readonly Favorite[]): CatalogueItem[] {
  return CATALOGUE.filter((item) => isFavorite(favorites, item.kind, item.key));
}
