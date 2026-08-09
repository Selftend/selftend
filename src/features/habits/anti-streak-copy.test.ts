import bgHabits from "@/src/i18n/locales/bg/habits.json";
import enHabits from "@/src/i18n/locales/en/habits.json";

/**
 * `show the record, don't read it` (#711), and its companion: the framework may
 * talk about missing, the product may not advertise its own restraint.
 *
 * The anti-streak framing was not introduced by the redesign - it was already
 * shipped in four strings across two locales, saying "no shame", "not failure"
 * and "never punish". Each is the product commenting on how kind it is being,
 * which tells the user their missed day was the kind of thing that *could* have
 * been punished. Naming the absent punishment is what puts it in the room.
 *
 * This guards the whole namespace rather than those four keys, because the next
 * copy change will be somewhere else.
 */
const RESTRAINT_CLAIMS: { locale: string; pattern: RegExp }[] = [
  { locale: "en", pattern: /no shame/i },
  { locale: "en", pattern: /\bshaming\b/i },
  { locale: "en", pattern: /never punish/i },
  { locale: "en", pattern: /punishes/i },
  { locale: "en", pattern: /no penalty/i },
  { locale: "en", pattern: /not (a )?failure/i },
  { locale: "bg", pattern: /без срам/i },
  { locale: "bg", pattern: /не наказва/i },
  { locale: "bg", pattern: /наказва(ме|ш|т)?\b/i },
  { locale: "bg", pattern: /не провал/i },
];

/** Every leaf string in the namespace, keyed by its dotted path. */
function flatten(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") return [[prefix, value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => flatten(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

describe("habits copy states the record instead of advertising restraint", () => {
  const namespaces = {
    en: flatten(enHabits),
    bg: flatten(bgHabits),
  };

  it.each(RESTRAINT_CLAIMS)("$locale copy never matches $pattern", ({ locale, pattern }) => {
    const offenders = namespaces[locale as "en" | "bg"]
      .filter(([, text]) => pattern.test(text))
      .map(([key, text]) => `${key}: ${text}`);

    expect(offenders).toEqual([]);
  });

  it("keeps the framework's own language, which is about missing rather than about us", () => {
    // The rule is named, and Never Miss Twice still explains itself. What went
    // is the sentence after it that graded the user's missed day.
    expect(enHabits.learn.cards["never-miss-twice"].short).toMatch(/Missing once is data/i);
    expect(enHabits.home.neverMissTwiceLine_one).toMatch(/Never miss twice/i);
  });

  it("says what the product does, not what it declines to do", () => {
    // "Selftend will never punish a missed day" became a statement of the
    // observable behaviour: the list says so.
    expect(enHabits.onboarding.neverMiss.neverMissBody).toMatch(/habit list says so/i);
    expect(enHabits.learn.cards["never-miss-twice"].body).toMatch(/habit list says so/i);
  });
});
