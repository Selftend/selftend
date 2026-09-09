import { FAQ_ENTRY_INDEX, FAQ_LAYOUT, type FaqEntrySlug } from "@/src/features/policies/faq-layout";
import bgPolicies from "@/src/i18n/locales/bg/policies.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";

const sections = enPolicies.faq.sections as { title: string; body: string[] }[];

const locales = [
  ["en", enPolicies],
  ["bg", bgPolicies],
] as const;

/**
 * `FAQ_LAYOUT` places every FAQ entry exactly once (#2145).
 *
 * ☠️ **This guard exists because moving the structure into code creates one new
 * failure mode that nothing else can see.** Today `InfoScreen` maps
 * `faq.sections`, so every entry renders by construction. Once `/faq` reads the
 * layout instead (#2147), membership is **opt-in** - and a fifteenth entry that
 * no clause places renders **nowhere**, on a live page, with every i18n gate
 * green: `locale-parity` sees the key in both locales, `i18n-key-coverage` sees
 * it resolve, and the copy gates happily scan a string nobody can read.
 *
 * So the assertion is a PARTITION, not a spot-check. Collecting the placed
 * indices and comparing them to `[0 … length - 1]` catches both halves at once:
 * an entry placed nowhere, and an entry placed twice. A spot-check on the count
 * would catch neither if they happened together.
 */
describe("FAQ_LAYOUT places every entry exactly once", () => {
  const placed: FaqEntrySlug[] = [
    FAQ_LAYOUT.crisis,
    ...FAQ_LAYOUT.pinned,
    ...FAQ_LAYOUT.groups.flatMap((group) => group.entries),
    FAQ_LAYOUT.letter,
  ];

  it("covers exactly the indices of faq.sections, with no gap and no repeat", () => {
    const indices = placed.map((slug) => FAQ_ENTRY_INDEX[slug]).sort((a, b) => a - b);
    const everyIndex = sections.map((_, index) => index);

    // Anti-vacuity: an empty layout would satisfy a subset check, and an empty
    // `sections` would satisfy the equality. Both ends are pinned to 14.
    expect(sections).toHaveLength(14);
    expect(placed).toHaveLength(14);
    expect(indices).toEqual(everyIndex);
  });

  it("names only slugs that exist in FAQ_ENTRY_INDEX", () => {
    // `as const` makes this a type error too, but the runtime assertion is what
    // survives someone widening a type to make a build pass.
    for (const slug of placed) {
      expect(FAQ_ENTRY_INDEX[slug]).toEqual(expect.any(Number));
    }
  });

  /**
   * ☠️ The slug → title pin. Without it, `FAQ_ENTRY_INDEX` is fourteen bare
   * numbers: reordering `faq.sections`, or retitling one entry, would silently
   * re-point the layout at the wrong answer - putting, say, the crisis entry
   * where "Is Selftend open source?" belongs, with the partition above still
   * perfectly green because the COUNT never changed.
   *
   * Precedent: `test/over-use-copy.test.ts` already pins an exact `en` FAQ title
   * for the same reason.
   */
  it.each(Object.entries(FAQ_ENTRY_INDEX))(
    "%s still names the entry it thinks it names",
    (slug, index) => {
      const expected: Record<string, string> = {
        therapy: "Is Selftend therapy?",
        crisis: "Can it help in a crisis?",
        free: "Is it really free? What's the catch?",
        needAccount: "Do I need an account?",
        dataCollected: "What data does Selftend collect?",
        whoCanSee: "Who can see my records?",
        exportDelete: "Can I export or delete my data?",
        noAi: "Why is there no AI counsellor?",
        minimumAge: "What is the minimum age?",
        parents: "For parents and guardians",
        reminders: "Are reminders annoying?",
        tooMuch: "Can I use Selftend too much?",
        openSource: "Is Selftend open source?",
        contact: "How can I contact you, and what should I expect?",
      };

      expect(sections[index].title).toBe(expected[slug]);
    },
  );

  /**
   * The crisis entry is pinned beside the callout rather than filed in a group,
   * and the letter renders as a letter. Asserted as facts about the layout so a
   * later edit that folds either into a group has to say so out loud.
   */
  it("keeps the crisis answer and the parents' letter out of the groups", () => {
    const grouped = FAQ_LAYOUT.groups.flatMap((group) => group.entries) as string[];

    expect(grouped).not.toContain(FAQ_LAYOUT.crisis);
    expect(grouped).not.toContain(FAQ_LAYOUT.letter);
    expect(FAQ_LAYOUT.pinned).not.toContain(FAQ_LAYOUT.crisis);
  });

  it("gives every group at least one entry, and no duplicate group keys", () => {
    const keys = FAQ_LAYOUT.groups.map((group) => group.key);

    expect(new Set(keys).size).toBe(keys.length);
    for (const group of FAQ_LAYOUT.groups) {
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });

  /**
   * ☠️ **Every group key has a label, in both locales - and this is the one place
   * the standing i18n gates are blind.**
   *
   * `/faq` resolves its group labels through a COMPOSED key,
   * `` t(`faq.groups.${key}`) ``. `test/i18n-key-coverage.test.ts` reads literal
   * `t("…")` strings out of the source and can never see this one, and
   * `locale-parity` only compares the two JSON files with each other - so a fifth
   * group added here with no label, or a `faq.groups` entry renamed in both
   * locales at once, ships a heading that renders as the raw string
   * `faq.groups.somethingElse` above real questions, with `verify` green.
   *
   * The reverse direction is checked too: a label with no group is a string
   * translators are paying attention to for a heading nothing renders.
   */
  describe.each(locales)("%s labels every group and no more", (_locale, policies) => {
    const labels = (policies.faq as { groups?: Record<string, string> }).groups ?? {};

    it("resolves a non-empty label for every group key", () => {
      // Anti-vacuity: a `for` over an empty layout passes every iteration it
      // never runs, and `FAQ_LAYOUT` is the thing under test here.
      expect(FAQ_LAYOUT.groups.length).toBe(4);

      for (const group of FAQ_LAYOUT.groups) {
        const label = labels[group.key];
        expect(typeof label).toBe("string");
        expect(label.trim().length).toBeGreaterThan(0);
        // A label that is its own key is what a missing translation looks like
        // once i18next has fallen back to returning the key.
        expect(label).not.toBe(`faq.groups.${group.key}`);
      }
    });

    it("ships no label for a group that does not exist", () => {
      expect(Object.keys(labels).sort()).toEqual(FAQ_LAYOUT.groups.map((g) => g.key).sort());
    });

    /**
     * ☠️ **The corpus is as long in this locale as the layout expects.**
     *
     * `/faq` reads entries by index, so an entry the locale does not carry
     * resolves to `undefined` and renders as **nothing** - one answer missing
     * from the page, in one language, with no error. The partition guard above
     * pins `en` alone, so without this the whole check is `en`-only.
     */
    it("carries an entry for every slug the layout places", () => {
      const localeSections = policies.faq.sections as { title: string; body: string[] }[];

      expect(localeSections).toHaveLength(Object.keys(FAQ_ENTRY_INDEX).length);
      for (const index of Object.values(FAQ_ENTRY_INDEX)) {
        expect(localeSections[index]?.title?.length).toBeGreaterThan(0);
      }
    });

    /**
     * ☠️ **The parents' letter's sub-heads are zipped POSITIONALLY with its
     * paragraphs, so the two lengths have to agree — in each locale separately.**
     *
     * `parentsSubheads` is an array rather than six named keys precisely so this
     * alignment is a checkable fact rather than a convention. Nothing else can
     * see a break in it: `locale-parity` compares the two files with each other
     * and would be perfectly happy with five sub-heads over seven paragraphs in
     * *both*, and `i18n-key-coverage` only asks whether the key resolves. The
     * failure it prevents is a sixth paragraph added to the letter in one locale
     * and rendering unlabelled, or a sub-head left behind by a merge and
     * rendering over nothing — on the longest entry on the page, and the one a
     * guardian arrives specifically to read.
     *
     * ⚠️ Read through `FAQ_ENTRY_INDEX`, not the literal `9`: the letter's index
     * is the layout's business, and the slug → title pin above is what keeps
     * that index honest.
     */
    it("gives the parents' letter one sub-head per paragraph", () => {
      const localeSections = policies.faq.sections as { title: string; body: string[] }[];
      const letter = localeSections[FAQ_ENTRY_INDEX[FAQ_LAYOUT.letter]];
      const subheads = (policies.faq as { parentsSubheads?: string[] }).parentsSubheads;

      // Anti-vacuity: `undefined === undefined` would pass a bare equality, and
      // two empty arrays would pass it as well.
      expect(Array.isArray(subheads)).toBe(true);
      expect(letter.body).toHaveLength(6);
      expect(subheads).toHaveLength(letter.body.length);

      for (const subhead of subheads ?? []) {
        expect(typeof subhead).toBe("string");
        expect(subhead.trim().length).toBeGreaterThan(0);
      }
    });

    it("names the page's own strings, so the screen has nothing to hardcode", () => {
      // The five keys `/faq` reads outside the corpus and the groups (#2147).
      // `pageTitle` is not on this list: `bg` keeps `Често задавани въпроси`
      // where `en` says `Common questions`, recorded deliberate at
      // `docs/i18n/bg-deliberate-divergence.md`. `pageDescription` IS parallel -
      // `en`'s was rewritten here and `bg`'s retranslated with it, since the old
      // `bg` line was a translation of an English sentence that no longer exists.
      const faq = policies.faq as unknown as Record<string, unknown>;
      for (const key of [
        "startHere",
        "expandAll",
        "collapseAll",
        "stillNotAnswered",
        "sendMessage",
      ]) {
        expect(typeof faq[key]).toBe("string");
        expect((faq[key] as string).trim().length).toBeGreaterThan(0);
      }
    });
  });
});
