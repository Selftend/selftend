import fs from "fs";
import path from "path";

import { VOICES, VOICE_CUES } from "../scripts/audio/catalog.mjs";
import { SHIP_FILE_COUNT } from "../scripts/audio/ship-plan.mjs";

/**
 * `scripts/audio/README.md` agrees with the code it documents about what ships
 * (#2220).
 *
 * The README kept describing a two-language lane — `guided-bg` as a live voice
 * id, sixteen slots, `27` as the target — for a week after #1585 had carried
 * the owner's 2026-08-31 rejection of the Bulgarian voices through every
 * `.mjs` file and left the README alone. Its own arbitration rule said
 * `SHIP_FILE_COUNT` wins, and nothing held the prose to that rule: no gate read
 * the file, which is why the drift survived.
 *
 * Three things are pinned, each to the code rather than to a number:
 *
 * 1. the count the README says ships is `SHIP_FILE_COUNT`;
 * 2. every `--voice-id <id>=` in a documented command names a voice in `VOICES`
 *    — a documented command that `resolveVoices` would throw on is the
 *    concrete way the stale lane misleads;
 * 3. the slot count the README states is the join `catalog.mjs` performs.
 *
 * ⚠️ Line numbers are deliberately not asserted; the file is long and edited
 * often. The phrases are matched instead.
 */
const README = fs.readFileSync(
  path.resolve(__dirname, "..", "scripts", "audio", "README.md"),
  "utf8",
);

const WORDS: Record<number, string> = {
  4: "four",
  8: "eight",
  16: "sixteen",
  32: "thirty-two",
};

describe("scripts/audio/README.md matches the audio code (#2220)", () => {
  it("says SHIP_FILE_COUNT is what ships, and names no other number as the target", () => {
    const ships = [...README.matchAll(/`(\d+)` is what ships/g)].map((m) => Number(m[1]));
    expect(ships).toEqual([SHIP_FILE_COUNT]);

    const targets = [...README.matchAll(/`(\d+)` is the target/g)].map((m) => Number(m[1]));
    expect(targets).toEqual([]);
  });

  it("documents --voice-id only with ids the catalog resolves", () => {
    const ids = [...README.matchAll(/--voice-id\s+([\w-]+)=/g)].map((m) => m[1]);
    const known = VOICES.map((voice: { id: string }) => voice.id);

    // A documented command exists at all — the assertion below is not vacuous.
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect({ id, known }).toEqual({ id, known: expect.arrayContaining([id]) });
    }
  });

  it("states the slot count the catalog's join produces", () => {
    // cues ⋈ voices ON lang — the join `voiceSlotSpec` performs.
    const slots = VOICE_CUES.reduce(
      (n: number, cue: { lang: string }) =>
        n + VOICES.filter((voice: { lang: string }) => voice.lang === cue.lang).length,
      0,
    );
    const word = WORDS[slots];
    expect(word).toBeDefined();

    expect(README).toMatch(new RegExp(`\\b${word} voice slots\\b`, "i"));
    // And no other spelled-out slot count is presented as current: every
    // mention of a different count is history, and history is marked as such.
    for (const [count, other] of Object.entries(WORDS)) {
      if (Number(count) === slots) continue;
      const stale = new RegExp(`\\b${other} voice slots\\b`, "i");
      expect({ other, stale: stale.test(README) }).toEqual({ other, stale: false });
    }
  });
});
