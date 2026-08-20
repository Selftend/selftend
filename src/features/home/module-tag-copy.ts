import type { ModuleTagKey } from "@/src/features/home/widget-registry";

/**
 * What a module tag prints, and what a screen reader hears instead (#1246).
 *
 * One literal map rather than an interpolated key each. The i18n coverage guard only sees
 * string-literal keys, so `home.arrange.moduleTag.${tag}` would be invisible to it and
 * these four strings would be free to rot unnoticed. `ModuleTagKey` makes the map total by
 * construction, so a third module cannot compile without a decision here - and pairing the
 * two keys per module keeps the seen and heard forms of one tag from drifting apart.
 *
 * ☠️ The printed tag is Latin in BOTH locales, and Bulgarian is deliberately asymmetric:
 * prose elsewhere in the app keeps the Cyrillic `КПТ` (sidebar, breadcrumb, programme
 * title, landing kicker), because that form is established Bulgarian while a Cyrillic ACT
 * form is not, and the bare lowercase word is a common noun. Do not "fix" this into
 * agreement.
 *
 * The spoken form carries the acronym AS WELL AS its expansion. That is WCAG 2.5.3 (Label
 * in Name), not redundancy: a voice-control user speaks what they can see, so dropping
 * `ACT` from the accessible name would leave "tap Defusion ACT" matching nothing. Each
 * `{{module}}` is one whole composed phrase per module rather than a slot-filling
 * template, because word order is not stable across locales.
 *
 * ⚠️ It lives in its own module, apart from the screen that renders it, for one reason
 * (#1247): the registry-level guard that proves every reachable tag has copy behind it
 * must read THESE key paths rather than rebuild them. A guard that reconstructs
 * `home.arrange.moduleTag.${tag}` proves only that its own reconstruction resolves, and
 * would stay green while a typo here shipped a raw key path to a user. Importing the
 * arrange screen into that suite to reach the map is not an option - it would drag
 * reanimated, sortables and the router into a plain data test.
 */
export const MODULE_TAG_KEYS: Record<ModuleTagKey, { label: string; a11y: string }> = {
  cbt: { label: "home.arrange.moduleTag.cbt", a11y: "home.arrange.moduleTag.cbtA11y" },
  act: { label: "home.arrange.moduleTag.act", a11y: "home.arrange.moduleTag.actA11y" },
};
