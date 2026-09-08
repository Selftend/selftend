import { LOCALE_STRINGS } from "@/test/locale-strings";

/**
 * Bulgarian body copy abbreviates the module as ДПТ, and the reminder switch
 * agrees with the notification it arms (#2191).
 *
 * `docs/modules/dbt-mckay-skills-workbook.md` §8.6 fixes the rule: **ДПТ in
 * body copy** (`bg/common.json` already writes КПТ); Latin DBT only in the
 * slots where the bg locale already uses Latin CBT / ACT — the sidebar label
 * and the favourites mark. `bg/notifications.json` broke it 36 lines apart from
 * itself: `targets.dbt.label` was "DBT" beside `targets.cbt.label` = "КПТ",
 * while the push that switch produces was titled "ДПТ практика". And the
 * first-run welcome read "КПТ, ACT или DBT" — one acronym transliterated and the
 * other not, inside one clause.
 *
 * ☠️ The allowlist is the spec's carve-out and nothing more. `navigation:sidebar.dbt`
 * is the sidebar slot, pre-existing on `main` and spec-sanctioned. Adding a key
 * here needs the spec's reason; the adjacent `targets.cbt.label = "КПТ"` is the
 * evidence that a target label is body copy, not a sidebar slot.
 */
const BG = LOCALE_STRINGS.bg;

/** Where the spec lets bg keep Latin `DBT`: the slots that already carry Latin CBT / ACT. */
const LATIN_SLOTS = new Set(["navigation:sidebar.dbt"]);

describe("bg abbreviates the DBT module as ДПТ (#2191)", () => {
  it("writes Latin DBT only in the spec's sidebar slot", () => {
    const latin = BG.filter(({ text }) => /\bDBT\b/.test(text))
      .map(({ namespace, key }) => `${namespace}:${key}`)
      .filter((id) => !LATIN_SLOTS.has(id));

    expect(latin).toEqual([]);
  });

  it("the allowlisted slot still carries Latin DBT, so the exemption is not stale", () => {
    for (const id of LATIN_SLOTS) {
      const [namespace, key] = id.split(":");
      const entry = BG.find((e) => e.namespace === namespace && e.key === key);
      expect({ id, text: entry?.text }).toEqual({ id, text: "DBT" });
    }
  });

  it("the reminder target's label is the abbreviation its notification title uses", () => {
    const label = BG.find((e) => e.namespace === "notifications" && e.key === "targets.dbt.label");
    const title = BG.find((e) => e.namespace === "notifications" && e.key === "copy.dbt.title");
    const cbt = BG.find((e) => e.namespace === "notifications" && e.key === "targets.cbt.label");

    expect(label?.text).toBe("ДПТ");
    expect(title?.text).toContain(label?.text ?? "");
    // The sibling that set the register: a Cyrillic label beside a Cyrillic one.
    expect(cbt?.text).toBe("КПТ");
  });
});
