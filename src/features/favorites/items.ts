import type { Href } from "expo-router";

import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";

/**
 * The favourites catalogue (#1955, spec #1885 §1.1): ONE ordered array of eleven items,
 * the eight tool hubs on `/tools` then the three modules on `/modules`.
 *
 * It lives here rather than on either page because the array's reason to be single is
 * the FILTER: Favourites is this array filtered to the rows the person starred, so a
 * favourited item holds the same relative position it holds in the catalogue below it.
 * No manual ordering and no `position` column anywhere - a filter, never a sort. Every
 * other consumer slices it (`TOOL_ITEMS`, `MODULE_ITEMS`), which gives "catalogue order"
 * exactly one referent, so nothing can be ordered wrongly.
 *
 * Tool order within the eight is free (#1610, #1861 D4). Module order is CBT, ACT, DBT.
 *
 * `key` is what the `favorites` table stores (`kind` is CHECKed there, `key` is bare
 * text), so a row for a key this array no longer names is simply ignored on read.
 */

export type ToolKey =
  "mood" | "journal" | "breathing" | "gratitude" | "grounding" | "meditation" | "sleep" | "habits";

export type ModuleKey = "cbt" | "act" | "dbt";

export type FavoriteKind = "tool" | "module";

interface ItemBase {
  href: Href;
  /** The `today.tools.*` / `today.modules.*Name` key, in the `navigation` namespace. */
  nameKey: string;
  /** The "what it is" line: `today.tools.*Sub` / `today.modules.*Sub`. */
  subKey: string;
}

export interface ToolItem extends ItemBase {
  kind: "tool";
  key: ToolKey;
  /** A decorative glyph; the mark takes `CHROME_MARK`. */
  icon: MaterialIconName;
}

export interface ModuleItem extends ItemBase {
  kind: "module";
  key: ModuleKey;
  /** The mark IS content here ("CBT"), so it takes `CHROME_TEXT`, not the mark ink. */
  abbreviation: string;
}

export type CatalogueItem = ToolItem | ModuleItem;

export const TOOL_ITEMS: readonly ToolItem[] = [
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
    // ☠️ The heart is the gratitude TOOL's glyph - which is why the star is a star.
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

export const MODULE_ITEMS: readonly ModuleItem[] = [
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

/** The whole catalogue, in the one order every surface renders it in. */
export const CATALOGUE: readonly CatalogueItem[] = [...TOOL_ITEMS, ...MODULE_ITEMS];

/**
 * The mutation scope one star's add and remove share (spec §2.4). TanStack's mutation
 * cache admits one pending mutation per scope and resumes the rest in insertion order,
 * which is what turns a fast star → unstar → star into press order on this client
 * rather than whichever request lands last.
 */
export function favoriteScopeId(kind: FavoriteKind, key: string): string {
  return `favorite:${kind}:${key}`;
}
