import { LOCALE_STRINGS } from "@/test/locale-strings";

/**
 * The Bulgarian cold-water instruction is cold, not lukewarm (#2214).
 *
 * `bg/dbt.json`'s physical-skills caution opened "Студена вода:" (cold water)
 * and then instructed "хладка чешмяна вода" — _хладък_ is lukewarm/tepid, the
 * register of a wash-with-lukewarm-water label — for a technique whose whole
 * point is the cold. The same English sentence, one file over in `bg/cbt.json`,
 * was translated correctly as "Хладна вода от чешмата" (cool tap water), and
 * the coping-plan pick `coolWaterOnMyWrists` carried the tepid word too. Three
 * temperatures for one instruction, and the learn page held the warm outlier.
 *
 * ☠️ The stem `хладк` is the tepid adjective in every inflection (хладък,
 * хладка, хладко, хладки); `хладн` (хладен, хладна, хладно) is _cool_. No
 * shipped string needs the tepid one — the app never tells anyone to use
 * lukewarm water — so the ban is on the stem, locale-wide, and the positive
 * assertion pins the two sentences #2214 named.
 */
const BG = LOCALE_STRINGS.bg;

describe("bg copy says cool or cold water, never lukewarm (#2214)", () => {
  it("carries the tepid adjective nowhere", () => {
    const tepid = BG.filter(({ text }) => /хладк/i.test(text)).map(
      ({ namespace, key, text }) => `${namespace}:${key} - ${text}`,
    );
    expect(tepid).toEqual([]);
  });

  it("the DBT cold-water caution and the coping-plan pick use the cool adjective", () => {
    const caution = BG.find(
      ({ namespace, text }) => namespace === "dbt" && text.startsWith("Студена вода:"),
    );
    expect(caution?.text).toMatch(/^Студена вода: хладна чешмяна вода/);

    const pick = BG.find(
      ({ namespace, key }) => namespace === "dbt" && key.endsWith("coolWaterOnMyWrists"),
    );
    expect(pick?.text).toMatch(/^Хладна вода/);
  });
});
