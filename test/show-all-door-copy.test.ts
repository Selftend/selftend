import { LOCALE_STRINGS, type Locale } from "@/test/locale-strings";

/**
 * **The arrow on a "show all" door is the component's job, never part of the string.**
 *
 * `ShowAllLink` renders the arrow as an `Icon` (#1375). Two shipped strings baked it
 * into the translated value instead - breathing's *"Show all sessions →"* and
 * gratitude's *"Show all entries →"* - which is three defects at once: two arrows the
 * moment the door goes through the shared component, a glyph in the accessible name,
 * and a piece of iconography handed to translators to get wrong (one of the two was
 * already a different arrow's worth of drift away from the other).
 *
 * Both were fixed with the extraction. This guard is what stops a third: a door string
 * is recognised by its KEY, in every namespace and both locales, so a new module
 * adopting the pattern is covered the day its key lands rather than the day someone
 * remembers to add it here.
 *
 * ☠️ Recognising doors by their TEXT would not work. The nine nouns differ per door and
 * bg is not a translation of the en wording ("Покажи всички стъпки" vs "Виж всички
 * сесии"), so a text pattern would have to enumerate both locales' phrasings - and it
 * would go blind the moment a translator rephrased one. The key is the stable half.
 */
const DOOR_KEY_PATTERNS = [
  /(^|\.)showAll[A-Za-z]*$/,
  /(^|\.)viewAll[A-Za-z]*$/,
  /(^|\.)seeAll$/,
  /(^|\.)allHistory\.link$/,
];

/**
 * Every arrow that has appeared in this repo's copy or is a plausible substitute for
 * one. The ASCII forms are here because a translator without the glyph reaches for
 * them, and they read as an arrow just as much.
 */
const ARROWS = /[→➔➜⟶⇒»›▸▶]|->|=>|>>/;

function doors(locale: Locale) {
  return LOCALE_STRINGS[locale].filter(({ key }) => DOOR_KEY_PATTERNS.some((p) => p.test(key)));
}

describe("a show-all door's arrow is an icon, not a character in the string", () => {
  it.each(["en", "bg"] as const)("%s door copy carries no arrow", (locale) => {
    const offenders = doors(locale)
      .filter(({ text }) => ARROWS.test(text))
      .map(({ namespace, key, text }) => `${namespace}:${key} - ${text}`);

    expect(offenders).toEqual([]);
  });

  /**
   * A guard that matches nothing passes forever. These are the doors that exist today,
   * named so a key rename has to come back here rather than silently emptying the set
   * it was written to police - the failure mode a copy-only pattern would have had.
   */
  it.each(["en", "bg"] as const)("%s still sees every shipped door", (locale) => {
    const found = doors(locale).map(({ namespace, key }) => `${namespace}:${key}`);

    expect(found).toEqual(
      expect.arrayContaining([
        "act:home.viewAllDefusion",
        "cbt:breathing.overview.showAll",
        "cbt:dashboard.seeAll",
        "cbt:grounding.recent.showAll",
        "cbt:home.showAllRecords",
        "gratitude:home.viewAll",
        "journal:detail.showAll",
        "journal:list.showAll",
        "meditation:module.home.showAllSits",
        "mood:allHistory.link",
        "navigation:wizard.showAllSteps",
        "sleep:allHistory.link",
      ]),
    );
  });

  /**
   * The strings the extraction fixed. Pinned by value, because "contains no arrow" is
   * also satisfied by deleting the string, and because these are the ones a Weblate
   * round-trip could quietly restore.
   *
   * `newPattern` is here rather than in `DOOR_KEY_PATTERNS` because it is not a
   * show-all door - it is breathing's creation link, which happens to sit in the same
   * section-header slot as one. It baked its arrow in the same way, and leaving it
   * would have put a glyph in one accessible name directly beside a door that had just
   * stopped doing that. A key-shaped rule cannot generalise from one creation link, so
   * it is named.
   */
  it("the strings that baked their arrow in read as plain labels in both locales", () => {
    const find = (locale: Locale, namespace: string, key: string) =>
      LOCALE_STRINGS[locale].find((entry) => entry.namespace === namespace && entry.key === key)
        ?.text;

    expect(find("en", "cbt", "breathing.overview.showAll")).toBe("Show all sessions");
    expect(find("bg", "cbt", "breathing.overview.showAll")).toBe("Виж всички сесии");
    expect(find("en", "gratitude", "home.viewAll")).toBe("Show all entries");
    expect(find("bg", "gratitude", "home.viewAll")).toBe("Виж всички записи");
    expect(find("en", "cbt", "breathing.overview.newPattern")).toBe("New pattern");
    expect(find("bg", "cbt", "breathing.overview.newPattern")).toBe("Нов модел");
  });
});
