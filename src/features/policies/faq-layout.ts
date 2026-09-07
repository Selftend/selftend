/**
 * Where each of the fourteen FAQ entries goes on `/faq` (#2145, ruled on #2127).
 *
 * ☠️ **The structure lives HERE and not in `faq.sections`, and that is a Weblate
 * constraint rather than a taste.** Every namespace is Weblate-tracked
 * (`docs/stack.md`), so re-nesting the entries would present all fourteen, in
 * both locales, as new source strings and orphan every Bulgarian translation of
 * them - for a page whose copy is ~95% unchanged. `navigation.json` already had
 * this exact decision made and rejected for the same reason.
 *
 * ☠️☠️ **And machine ids must never enter a tracked namespace.** A `role:
 * "pinned"` field in the JSON would be shown to translators as translatable
 * text; someone doing exactly their job and rendering `pinned` into Bulgarian
 * would break the page - invisibly to BOTH standing i18n gates, since
 * `locale-parity` sees the key in both files and `i18n-key-coverage` sees it
 * resolve. Structure in code cannot be translated by accident.
 *
 * So `faq.sections` keeps its path, its order and its uniform
 * `{ title, body: string[] }` shape, which is also what lets it join
 * `policy-content.test.ts`'s existing shape guard for free.
 *
 * ⚠️ Names are NOT here. Group labels are translatable and live at
 * `faq.groups.*` in the locale files; this file holds only structure.
 *
 * Nothing consumes this yet - the FAQ screen lands on #2147. It is committed
 * ahead of its consumer with its guard, so the partition below is enforced from
 * the moment the data exists rather than from the moment something renders it.
 */

/**
 * Slug → index into `policies:faq.sections`.
 *
 * The layout references entries by name because bare indices are opaque: a
 * reader cannot tell whether `7` is the right entry, and a reviewer cannot
 * either. `faq-layout.test.ts` pins each slug against the `en` title it names,
 * so a reorder or a retitle of `faq.sections` fails the build instead of
 * silently re-pointing the layout at the wrong answer.
 */
export const FAQ_ENTRY_INDEX = {
  therapy: 0,
  crisis: 1,
  free: 2,
  needAccount: 3,
  dataCollected: 4,
  whoCanSee: 5,
  exportDelete: 6,
  noAi: 7,
  minimumAge: 8,
  parents: 9,
  reminders: 10,
  tooMuch: 11,
  openSource: 12,
  contact: 13,
} as const;

export type FaqEntrySlug = keyof typeof FAQ_ENTRY_INDEX;

/**
 * The page's shape: one pinned crisis answer beside the callout, a "Start here"
 * block, four labelled groups, and the parents' letter last.
 *
 * ☠️ **Membership is OPT-IN, and that is the one new failure mode this file
 * creates.** `InfoScreen` maps `faq.sections` flatly, so every entry renders by
 * construction; once the page reads this constant instead, an entry that no
 * clause below places renders **nowhere, silently**. The partition assertion in
 * `faq-layout.test.ts` is aimed squarely at that: a fifteenth entry fails the
 * build rather than vanishing from the page, and so does an entry placed twice.
 */
export const FAQ_LAYOUT = {
  /** Pinned beside `CrisisSupportCallout`, above everything else. */
  crisis: "crisis",
  /** The "Start here" block. */
  pinned: ["therapy", "free", "whoCanSee", "noAi"],
  /** Labels resolve from `faq.groups.<key>`; only the structure is here. */
  groups: [
    { key: "account", entries: ["needAccount", "exportDelete", "minimumAge"] },
    { key: "privacy", entries: ["dataCollected"] },
    { key: "usingIt", entries: ["reminders", "tooMuch"] },
    { key: "project", entries: ["openSource", "contact"] },
  ],
  /** The parents' letter, which renders as a letter rather than as a Q&A. */
  letter: "parents",
} as const;
