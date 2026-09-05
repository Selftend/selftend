import { type Href } from "expo-router";

import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { CopingPlanSection } from "@/src/features/dbt/types";

/**
 * The coping plan's menus (spec §3.1.1).
 *
 * ☠️ **A saved plan stores the KEY, never the label** (decision 14). That is the
 * whole reason this file exists: copy has to be free to change under a plan
 * someone built a year ago, and a plan that stored its own labels would freeze
 * the app's words into the person's document and make the export a snapshot of
 * whatever the copy said that day. `pickLabelKey` resolves a key to its string;
 * an unknown key resolves to nothing and the item is dropped from the view
 * rather than rendered blank - which is also what happens if a pick is ever
 * retired.
 *
 * **Every line here is new app-written copy.** No curated menu of this shape
 * exists anywhere in the app to borrow from, and the workbook's own lists are
 * not lifted: they run to a hundred items, they are written for an adult in
 * crisis, and several of them are cut by ruling (§9) - the self-injury
 * substitutes, the crisis-line item, the twelve-step chore, the massage aside,
 * the higher-power menu, and anything whose point is *relief like* something.
 *
 * A pick may carry a ROUTE, which is what makes the card actionable rather
 * than a list to read: the chapter-3 physical skills reach the plan this way,
 * through tools that already ship with their own cautions on their own intros.
 * The card shows no caution of its own - it is read in a hard moment, and the
 * technique's own screen is where the caution belongs.
 */
export interface CopingPlanPick {
  key: string;
  section: CopingPlanSection;
  /** The uppercase label a run of picks sits under. `null` for a flat section. */
  family: string | null;
  /** Where the pick goes when it is tapped on the card. Most picks go nowhere. */
  route?: Href;
  /** Shown beside a route-bearing pick, on the card and in the builder. */
  icon?: MaterialIconName;
}

const distract = (family: string, key: string, extra: Partial<CopingPlanPick> = {}) => ({
  key,
  section: "distract" as const,
  family,
  ...extra,
});

const soothe = (family: string, key: string, extra: Partial<CopingPlanPick> = {}) => ({
  key,
  section: "soothe" as const,
  family,
  ...extra,
});

/**
 * The picks, in the order the builder draws them.
 *
 * ⚠️ Order is data, not decoration: the builder renders families in this
 * sequence and the card renders a saved plan in the person's own order, so
 * inserting a pick in the middle changes nothing about anyone's saved plan -
 * `position` lives on the item, not here.
 */
export const COPING_PLAN_PICKS: CopingPlanPick[] = [
  // ── Distract: six families ──────────────────────────────────────────────────
  distract("move", "walk"),
  distract("move", "stretch"),
  distract("move", "shower"),
  distract("move", "danceToOneSong"),
  distract("move", "tenseAndRelease"),
  distract("makeOrFix", "tidyOneSurface"),
  distract("makeOrFix", "washUp"),
  distract("makeOrFix", "waterThePlants"),
  distract("makeOrFix", "fixSomethingSmall"),
  distract("makeOrFix", "cookSomething"),
  distract("someoneElse", "messageAFriend"),
  distract("someoneElse", "helpWithSomething"),
  distract("someoneElse", "peopleWatch"),
  distract("someoneElse", "lookAtAPhoto"),
  distract("someoneElse", "sitWithAPet"),
  distract("changeChannel", "aShow"),
  distract("changeChannel", "aGame"),
  distract("changeChannel", "aSong"),
  distract("changeChannel", "aBook"),
  distract("changeChannel", "aGoodMemory"),
  distract("changeChannel", "aPlaceInMyHead"),
  distract("count", "countBreaths", { route: "/tools/breathing", icon: "air" }),
  distract("count", "countBlueThings"),
  distract("count", "countBackwardsBySevens"),
  distract("count", "fiveFourThreeTwoOne", { route: "/tools/grounding", icon: "anchor" }),
  distract("leave", "stepOutside"),
  distract("leave", "anotherRoom"),
  distract("leave", "aWalkToNowhere"),
  distract("leave", "planSomethingIEnjoy", {
    route: "/modules/cbt/activities",
    icon: "directions-run",
  }),
  distract("leave", "writeItDown", { route: "/tools/journal", icon: "edit-note" }),

  // ── Soothe: one family per sense ────────────────────────────────────────────
  soothe("smell", "somethingThatSmellsGood"),
  soothe("smell", "freshAir"),
  soothe("smell", "coffeeOrTea"),
  soothe("smell", "cleanLaundry"),
  soothe("see", "somethingGreen"),
  soothe("see", "theSky"),
  soothe("see", "photosILike"),
  soothe("see", "lowLight"),
  soothe("hear", "aSongIKnow"),
  soothe("hear", "rainOrWaves"),
  soothe("hear", "quiet"),
  soothe("hear", "anAmbientSound", { route: "/tools/meditation", icon: "self-improvement" }),
  soothe("taste", "somethingWarmToDrink"),
  soothe("taste", "somethingSharp"),
  soothe("taste", "eatSlowly"),
  soothe("touch", "aBlanket"),
  soothe("touch", "aWarmShower"),
  soothe("touch", "handsInWater"),
  soothe("touch", "coolWaterOnMyWrists", {
    route: "/tools/grounding/cold-water",
    icon: "ac-unit",
  }),
  soothe("touch", "somethingSoftInMyPocket"),

  // ── Remind myself: a flat run of short lines ────────────────────────────────
  { key: "thisWillPass", section: "remind", family: null },
  { key: "gotThroughBefore", section: "remind", family: null },
  { key: "feelingIsNotDoing", section: "remind", family: null },
  { key: "mistakesAreNormal", section: "remind", family: null },
  { key: "feelingsAreAWave", section: "remind", family: null },
  { key: "iCanDoOneThing", section: "remind", family: null },
  { key: "iDoNotHaveToDecideNow", section: "remind", family: null },
  { key: "iAmAllowedToAskForHelp", section: "remind", family: null },
];

const PICKS_BY_KEY = new Map(COPING_PLAN_PICKS.map((pick) => [pick.key, pick]));

/** The pick a saved item names, or undefined once a pick has been retired. */
export function findPick(key: string | undefined): CopingPlanPick | undefined {
  return key === undefined ? undefined : PICKS_BY_KEY.get(key);
}

/** The `dbt` key holding a pick's label. */
export function pickLabelKey(key: string): string {
  return `picks.${key}`;
}

/** The families of one section, in builder order, each with its picks. */
export function familiesOf(
  section: CopingPlanSection,
): { family: string | null; picks: CopingPlanPick[] }[] {
  const out: { family: string | null; picks: CopingPlanPick[] }[] = [];
  for (const pick of COPING_PLAN_PICKS) {
    if (pick.section !== section) continue;
    const last = out[out.length - 1];
    if (last && last.family === pick.family) last.picks.push(pick);
    else out.push({ family: pick.family, picks: [pick] });
  }
  return out;
}

/** The three sections, in the order the builder and the card both use. */
export const COPING_PLAN_SECTIONS: CopingPlanSection[] = ["distract", "soothe", "remind"];

/**
 * The fallback list's length, ruled rather than guessed: fewer than three is
 * not a fallback sequence, and more than six is not readable in a hard moment.
 * The database guard re-checks both ends.
 */
export const FALLBACK_MIN = 3;
export const FALLBACK_MAX = 6;

/** An own line's cap, matching the column's own check. */
export const OWN_TEXT_MAX = 120;

/** The whole plan's cap, matching the column's own check. */
export const PLAN_ITEM_MAX = 60;
