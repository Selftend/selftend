import { FAQ_ENTRY_INDEX, FAQ_LAYOUT, type FaqEntrySlug } from "@/src/features/policies/faq-layout";
import enPolicies from "@/src/i18n/locales/en/policies.json";

const sections = enPolicies.faq.sections as { title: string; body: string[] }[];

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
});
