import type { ChipCategoryKey, ModuleTagKey } from "@/src/features/home/widget-registry";

/**
 * The arrange chip run's two literal copy maps: the heading each group prints, and the
 * module a tagged chip names to a screen reader.
 *
 * Literal maps rather than an interpolated key each. The i18n coverage guard only sees
 * string-literal keys sitting directly inside a `t(...)` call, so
 * `home.arrange.addCategory.${category}` would be invisible to it and these strings would
 * be free to rot unnoticed. The two key types make both maps total by construction, so a
 * third module cannot compile without a decision here.
 *
 * ⚠️ They live in their own module, apart from the screen that renders them, for one
 * reason (#1247): the registry-level guard that proves every reachable key has copy behind
 * it must read THESE key paths rather than rebuild them. A guard that reconstructs
 * `home.arrange.addCategory.${category}` proves only that its own reconstruction
 * resolves, and would stay green while a typo here shipped a raw key path to a user.
 * Importing the arrange screen into that suite to reach the maps is not an option - it
 * would drag reanimated, sortables and the router into a plain data test.
 */

/**
 * The heading each chip group prints.
 *
 * ☠️ Bulgarian is deliberately asymmetric, and in the OPPOSITE direction to the tag this
 * replaced. A heading is prose, so it takes the established Bulgarian `КПТ` that the
 * sidebar, breadcrumb, programme title and landing kicker all use; the retired tag was
 * Latin `CBT` in both locales precisely because it was a tag and not prose. ACT stays
 * Latin in both, because no Cyrillic ACT form is established and the bare lowercase word
 * is a common noun. Do not "fix" either of these into agreement with the other.
 *
 * `tool` is `Tools`, not home's `Your tools` (`home.tiers.tools`). The owned rows above
 * are yours; this run is the catalogue of what exists, and nothing in it is yours yet.
 */
export const CHIP_CATEGORY_KEYS: Record<ChipCategoryKey, string> = {
  tool: "home.arrange.addCategory.tools",
  cbt: "home.arrange.addCategory.cbt",
  act: "home.arrange.addCategory.act",
};

/**
 * What a screen reader hears for the module a tagged chip belongs to (#1246).
 *
 * The spoken form carries the acronym AS WELL AS its expansion, and each `{{module}}` is
 * one whole composed phrase per module rather than a slot-filling template, because word
 * order is not stable across locales.
 *
 * ☠️ This is the ONLY surviving half of the module tag, and the printed half is gone on
 * purpose rather than by neglect: the group headings now carry the family resemblance that
 * `Defusion`, `Make room` and `Choice point` needed, so a per-chip acronym would say
 * twice what the heading above already says once. Do not restore a printed tag alongside
 * the headings.
 *
 * It survives because a heading is a VISUAL grouping. A screen-reader user browsing the
 * run by button rotor hears the chips without the headings between them, so the module
 * has to ride in the accessible name or it is lost to them alone. Extra content in an
 * accessible name is permitted - WCAG 2.5.3 (Label in Name) constrains only that the
 * visible label appear IN the name, which `home.arrange.addChipTagged` keeps.
 */
export const MODULE_TAG_KEYS: Record<ModuleTagKey, string> = {
  cbt: "home.arrange.moduleTag.cbtA11y",
  act: "home.arrange.moduleTag.actA11y",
};
