import { LOCALE_STRINGS, type Locale, type LocaleString } from "@/test/locale-strings";

/**
 * The over-use obligation's answer, as copy (#1659, content by #1671, ADR-0004
 * § *The over-use obligation*): **"too much" is a way of using, not an amount.**
 *
 * Two surfaces carry it, and only two. The CBT Learn card teaches it in the
 * framework's voice where teaching is sought; the FAQ answers it in public,
 * where a store reviewer or a journalist actually meets it. Each carries the
 * same one-sentence professional door.
 *
 * Three things this pins, one per ruling that would otherwise be re-litigated
 * on the next copy touch:
 *
 * - **Static.** A computed "you've done enough today" was refused doubly (it
 *   appraises the record back at the user, #711/#952, and it measures the wrong
 *   variable). The cheapest tell that a count has crept back in is an
 *   interpolation placeholder — a static teaching interpolates nothing.
 * - **The door is on both surfaces.** Delivery is teaching plus the tools'
 *   shape; the referral seam IS the card (ruling 4), not a link, not a page.
 * - **The crisis page stays urgent-only.** A "beyond self-help" section there
 *   was rejected for diluting the register that separateness protects, so the
 *   teaching's signature phrase must never appear under `policies:crisis`.
 *
 * ☠️ Cyrillic patterns carry no `\b` — JS `\b` is ASCII-only, and a Cyrillic
 * pattern written with it matches nothing (see `practice-copy.test.ts`).
 */
const VOICE: Record<
  Locale,
  { faqTitle: RegExp; door: RegExp; modeNotAmount: RegExp; signature: RegExp }
> = {
  en: {
    faqTitle: /^Can I use Selftend too much\?$/,
    door: /worth bringing to a professional/i,
    modeNotAmount: /more records in a day is not more progress/i,
    signature: /challenging that has become checking/i,
  },
  bg: {
    faqTitle: /^Мога ли да използвам Selftend прекалено много\?$/,
    door: /да споделиш със специалист/i,
    modeNotAmount: /повече записи в един ден не са повече напредък/i,
    signature: /оспорване, което е станало проверяване/i,
  },
};

function learnCard(locale: Locale): LocaleString[] {
  return LOCALE_STRINGS[locale].filter(
    ({ namespace, key }) => namespace === "cbt" && key.startsWith("learn.pacing."),
  );
}

/** The FAQ entry's body strings, located by its title so a reorder cannot unpin it. */
function faqEntry(locale: Locale): LocaleString[] {
  const title = LOCALE_STRINGS[locale].find(
    ({ namespace, key, text }) =>
      namespace === "policies" &&
      /^faq\.sections\[\d+\]\.title$/.test(key) &&
      VOICE[locale].faqTitle.test(text),
  );
  if (!title) return [];
  const prefix = title.key.replace(/\.title$/, ".body[");
  return LOCALE_STRINGS[locale].filter(
    ({ namespace, key }) => namespace === "policies" && key.startsWith(prefix),
  );
}

describe.each<Locale>(["en", "bg"])(
  "%s: the over-use answer is static teaching with a professional door (#1659/#1671)",
  (locale) => {
    const voice = VOICE[locale];

    it("the CBT Learn card exists and teaches mode over amount", () => {
      const card = learnCard(locale);
      expect(card.length).toBeGreaterThanOrEqual(3);
      expect(card.some(({ text }) => voice.modeNotAmount.test(text))).toBe(true);
      expect(card.some(({ text }) => voice.signature.test(text))).toBe(true);
    });

    it("the FAQ entry exists and gives the same answer in public", () => {
      const entry = faqEntry(locale);
      expect(entry.length).toBeGreaterThan(0);
      expect(entry.some(({ text }) => voice.signature.test(text))).toBe(true);
    });

    it("both surfaces carry the professional door", () => {
      expect(learnCard(locale).some(({ text }) => voice.door.test(text))).toBe(true);
      expect(faqEntry(locale).some(({ text }) => voice.door.test(text))).toBe(true);
    });

    it("neither surface interpolates anything - a count would have to", () => {
      const strings = [...learnCard(locale), ...faqEntry(locale)];
      // Positive control, so a missing surface cannot pass this vacuously.
      expect(strings.length).toBeGreaterThanOrEqual(4);
      for (const { key, text } of strings) {
        expect(`${key}: ${text}`).not.toMatch(/\{\{/);
      }
    });

    it("the crisis page does not carry the teaching", () => {
      const crisis = LOCALE_STRINGS[locale].filter(
        ({ namespace, key }) => namespace === "policies" && key.startsWith("crisis."),
      );
      // Positive control: the crisis copy really did load.
      expect(crisis.length).toBeGreaterThan(0);
      expect(
        crisis
          .filter(({ text }) => voice.signature.test(text) || voice.door.test(text))
          .map(({ key }) => key),
      ).toEqual([]);
    });
  },
);
