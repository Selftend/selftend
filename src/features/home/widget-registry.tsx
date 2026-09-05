import { CbtProgrammeWidget } from "@/src/features/home/widgets/cbt-programme-widget";
import { ActProgrammeWidget } from "@/src/features/home/widgets/act-programme-widget";
import { WIDGET_META } from "@/src/features/widgets/widget-meta";

type WidgetComponent = React.ComponentType<{ userId: string }>;

/**
 * Card components for the ids that still render as cards - now exactly the two
 * `programme` ids, whose card #977 reshapes. #975 moved the nine tool ids to `ToolRow`
 * and #976 took the remaining fourteen, so the whole `tool` tier is rows.
 *
 * This is NOT the dashboard catalogue - `WIDGET_META` is, and it still holds all 25 ids.
 * Since #1952 it lives with its owner, the Android launcher (`src/features/widgets/
 * widget-meta.ts`); Home only reads it. Anything asking "does this id exist" or "where
 * does it go" reads the meta; the launcher's `CARD_REPLICAS` mirrors the meta too, which
 * is why it is unaffected by every deletion above.
 */
export const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  "cbt-programme": CbtProgrammeWidget,
  "act-programme": ActProgrammeWidget,
};

/** The guided modules a widget can be tagged with. Keys, not display strings. */
export type ModuleTagKey = "cbt" | "act";

/**
 * Which guided module a widget belongs to, or `undefined` for a standalone one (#1246).
 *
 * The arrange screen's chip run prints this as a trailing acronym so a user can tell that
 * `Defusion`, `Make room` and `Choice point` are one family rather than three novelties.
 * It returns the module KEY: the caller owns the display string, because what is printed
 * (`ACT`) and what a screen reader hears (`ACT - Acceptance and Commitment Therapy`) are
 * two different strings for the same answer.
 *
 * It lives here, beside the other accessors, for one reason: the screen and the
 * registry-level guards must ask *the same* function. A guard that re-implements this
 * predicate can agree with itself while both drift from what the chip actually renders.
 *
 * No new meta field and no migration - `tier`, `route` and `toolKey` all already exist on
 * every entry. The route test and the tool-key test select exactly the same 14 ids, so
 * either alone would do; both are kept because together they read as the intent.
 *
 * ⚠️ The `tier` clause IS the programme-card exemption, and it is a rule rather than an
 * exception list: the two `programme` ids already carry their acronym in their own titles,
 * so a tag would only repeat them. Exempting by title *content* was rejected - a
 * translation edit could then silently flip a widget's tagging, and it is already broken
 * in Bulgarian, where one programme title is Latin and the other Cyrillic.
 *
 * ☠️ The `cbt-`/`act-` id prefix is NOT the rule. `self-care` carries no prefix but routes
 * into the CBT module and declares the CBT tool key, so it is tagged like the rest. Do not
 * "correct" it out on sight.
 *
 * An unknown tool key returns `undefined`, so a widget for a third module would be
 * silently untagged rather than crash. Silence is the wrong failure here, which is why
 * #1247 makes it loud in the test suite rather than at runtime.
 */
export function moduleTagFor(widgetId: string): ModuleTagKey | undefined {
  const meta = WIDGET_META[widgetId];
  if (!meta || meta.tier !== "tool") return undefined;
  if (!meta.route.startsWith("/modules/")) return undefined;
  return meta.toolKey === "cbt" || meta.toolKey === "act" ? meta.toolKey : undefined;
}

/** The three groups the arrange chip run is divided into. Keys, not display strings. */
export type ChipCategoryKey = "tool" | "cbt" | "act";

/** The order the run prints its groups in: the standalone tools first, then each module. */
export const CHIP_CATEGORY_ORDER: readonly ChipCategoryKey[] = ["tool", "cbt", "act"];

/**
 * Which group a widget's arrange chip renders under.
 *
 * This is the GROUPING question, and it is deliberately not the same question as
 * `moduleTagFor`, even though the two agree about 14 of the 25 ids. Grouping is total -
 * every chip prints under exactly one heading, so there is no `undefined` to render - and
 * it takes the two `programme` ids WITH their module rather than exempting them. Under a
 * heading, `CBT programme` sitting beside `Thought record` is the honest shape of the
 * catalogue; a fourth `Guided programmes` group would split each module across two
 * headings for no gain a browsing user can use.
 *
 * ☠️ Do not collapse this into `moduleTagFor`. That predicate answers what a chip's
 * ACCESSIBLE NAME says, and its programme exemption still holds for the reason it always
 * did: those two titles already carry the acronym, so naming the module again would
 * announce "CBT programme, CBT - Cognitive Behavioural Therapy". Grouping has no such
 * problem, because a heading is printed once rather than once per chip. Two questions,
 * two answers, and the widget-registry suite pins both.
 *
 * The `/modules/` route is the rule, exactly as it is there - ☠️ `self-care` carries no
 * `cbt-` prefix but routes into the CBT module, so it groups with CBT. The id prefix is
 * not the rule here either.
 *
 * An unknown module route falls back to `tool`. That is the wrong answer, and it is the
 * same silent failure `moduleTagFor` carries: a third module's widget would file itself
 * among the standalone tools rather than crash. It is made loud in the same place the
 * other one is - widget-registry.test.tsx, against the real registry with no mocks.
 */
export function chipCategoryFor(widgetId: string): ChipCategoryKey {
  const meta = WIDGET_META[widgetId];
  if (!meta || !meta.route.startsWith("/modules/")) return "tool";
  return meta.toolKey === "cbt" || meta.toolKey === "act" ? meta.toolKey : "tool";
}

/**
 * Whether the dashboard can render this id at all.
 *
 * Re-based on `WIDGET_META` by #975: `WIDGET_REGISTRY` used to hold a card component for
 * every id, so "has a component" and "is in the catalogue" were the same question. The
 * tool tier renders rows straight from the catalogue and needs no component, so the
 * registry is now the *programme and not-yet-converted* half only - asking it would
 * start hiding owned rows the moment a tool widget is deleted.
 *
 * Behaviour is unchanged: every catalogued id was already implemented (the `soon` branch
 * this gates has never rendered, because no meta entry carries that status).
 */
export function isImplemented(widgetId: string): boolean {
  return widgetId in WIDGET_META;
}

export function resolveWidget(widgetId: string, userId: string): React.ReactElement | null {
  const Component = WIDGET_REGISTRY[widgetId];
  if (!Component) return null;
  return <Component userId={userId} />;
}
