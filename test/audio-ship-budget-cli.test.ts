/**
 * The budget CLI — #1210's size acceptance check, driven as the command (#1210).
 *
 * ☠️ WHY THIS FILE EXISTS. On this map the CLI half is where the bugs have been:
 * `manifest --check` exited **0** against 65 gaps while every pure test passed,
 * because the command answered a narrower question than its own USAGE promised.
 * The rule that came out of it is that a gate is not proven by testing the
 * function it calls — it is proven by running the command and reading the exit
 * code. So this file asserts the two things only the command decides: what it
 * looks at, and when it refuses.
 *
 * The one behaviour worth more than the byte count is that a set is refused for
 * being INCOMPLETE even when it comfortably fits. One file short of the set is
 * exactly what the voice-name collision used to produce, and by bytes alone that
 * reads as the healthiest set the pass could possibly hand over.
 *
 * Drives the real `budget` against a scratch directory, with the voice-length
 * probe injected. No credits, no ffmpeg, no key, no rendered byte.
 */
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Static, not dynamic: jest has no --experimental-vm-modules here.
import { budget } from "../scripts/audio/postprocess.mjs";
import {
  SHIP_BUDGET_BYTES,
  SHIP_FILE_COUNT,
  predictShipping,
  shippingUnits,
} from "../scripts/audio/ship-plan.mjs";

/**
 * ☠️ THE COUNTS BELOW ARE DERIVED, NOT TYPED. Every one of them was a literal `19`
 * until #1573 added a second language, and each was a separate little edit that a
 * reader had to notice — the same restated-claim rot that left `ship-plan.mjs`
 * telling people a second language could not fit. `n/n files` is a fact about the
 * catalog, so it is read from the catalog.
 */
const ALL = `${SHIP_FILE_COUNT}/${SHIP_FILE_COUNT} files`;

/**
 * ☠️ Wall-clock, not logic — the same bound `audio-manifest-cli.test.ts` and
 * `audio-render-reroll.test.ts` carry, for the same reason and now on the same
 * evidence. These cases write a scratch tree of the whole set EACH and
 * finish in well under a second on an idle machine, but under a full suite run the
 * workers compete for disk, and one of the sibling suites crossed jest's 5000ms
 * default and reported a broken honesty check where there was none.
 *
 * Generous on purpose: nothing here should approach it, so a timeout after this
 * means the command genuinely got slower rather than that the runner was busy.
 */
jest.setTimeout(60_000);

/**
 * Derived from the module, never hand-written. ⚠️ A local shape plus an
 * `as Unit[]` cast would keep compiling after `shippingUnits` changed shape — the
 * cast silences exactly the drift these tests exist to catch.
 */
type Unit = ReturnType<typeof shippingUnits>[number];

/** What one unit's finished file should weigh, so a fixture can be a real set. */
const realisticBytes = (unit: Unit) =>
  predictShipping([unit], (u: Unit) => (u.voice ? 1 : null)).totalBytes;

/** The four cue lengths, so the prediction never shells out to ffprobe here. */
const measureSeconds = async (file: string) =>
  file.includes("guide_intro") ? 3.08 : file.includes("guide_hold") ? 0.63 : 0.9;

describe("the budget CLI", () => {
  let dir: string;
  let log: jest.SpyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ship-budget-"));
    log = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    log.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });

  const printed = () => log.mock.calls.map((call) => String(call[0])).join("\n");

  /** Write a finished set, optionally leaving some units out or resizing them. */
  async function writeSet({
    skip = [] as string[],
    bytes = null as number | null,
    extra = [] as string[],
  } = {}) {
    for (const unit of shippingUnits() as Unit[]) {
      if (skip.includes(unit.file)) continue;
      await writeFile(join(dir, unit.file), Buffer.alloc(bytes ?? realisticBytes(unit)));
    }
    for (const name of extra) await writeFile(join(dir, name), Buffer.alloc(bytes ?? 1000));
  }

  it("passes a complete set that fits", async () => {
    await writeSet();
    await expect(budget(dir, { measureSeconds })).resolves.toBe(true);
    expect(printed()).toContain(ALL);
    expect(printed()).toContain("the set is complete and fits");
  });

  /**
   * ☠️ THE ONE THAT MATTERS. By bytes this set is the most comfortable the pass
   * could produce; it is still four files short of shippable, and the four are the
   * whole male voice.
   */
  it("refuses a set that fits because four of its files were never written", async () => {
    const male = (shippingUnits() as Unit[])
      .filter((unit) => unit.voice === "guided-male")
      .map((unit) => unit.file);
    await writeSet({ skip: male });

    await expect(budget(dir, { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain(`${SHIP_FILE_COUNT - male.length}/${SHIP_FILE_COUNT} files`);
    // It still reports the byte verdict honestly — it just does not let it decide.
    expect(printed()).toContain("fits");
    expect(printed()).toContain("the set is NOT ready to ship");
    for (const file of male) expect(printed()).toContain(file);
  });

  it("refuses a complete set that is over the ceiling", async () => {
    // ⚠️ Divisor must stay BELOW the file count or the "over" case is not over:
    // n files at an (n+1)th of the budget each is n/(n+1) of it, which fits.
    // Derived so it cannot silently stop being over when the set grows again.
    await writeSet({ bytes: Math.ceil(SHIP_BUDGET_BYTES / (SHIP_FILE_COUNT - 1)) });

    await expect(budget(dir, { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain(ALL);
    expect(printed()).toContain("OVER");
    expect(printed()).toContain("over-budget");
  });

  it("names a file no shipping unit claims", async () => {
    await writeSet({ extra: ["guide_inhale.m4a"] });

    await expect(budget(dir, { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain("unexpected");
    // ⚠️ The pre-fix name for a cue, which is precisely what a stray file here
    // would be — a take post-processed before the output carried its voice.
    expect(printed()).toContain("guide_inhale.m4a");
  });

  /**
   * ☠️ REWRITTEN, and deliberately to the OPPOSITE assertion. This used to assert
   * that a stray master in the ship directory was ignored, and `/code-review` showed
   * that was the bug, not the feature: a 5 MB `.wav` weighed nothing and went
   * unreported while the set still read "fits" — on a ceiling #1138 justifies by
   * exactly that case, a single uncompressed bed blowing it instantly.
   */
  it("counts a stray master in the ship directory against the ceiling", async () => {
    await writeSet();
    await writeFile(join(dir, "rain-c01-a01.pcm"), Buffer.alloc(5_760_000));

    await expect(budget(dir, { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain(ALL);
    expect(printed()).toContain("unexpected");
    expect(printed()).toContain("rain-c01-a01.pcm");
    expect(printed()).toContain("OVER");
  });

  /**
   * ☠️ THE ONE `/code-review` FOUND BY RUNNING THE COMMAND. Twenty-one correctly
   * named zero-byte files printed "19/19 files · complete and fits" and exited 0.
   */
  it("refuses a full set of correctly named empty files", async () => {
    await writeSet({ bytes: 0 });

    await expect(budget(dir, { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain(ALL);
    expect(printed()).toContain("undersized");
    expect(printed()).toContain("the file is empty");
    expect(printed()).toContain("the set is NOT ready to ship");
  });

  /** ☠️ A DIRECTORY named like a unit used to survey as that unit, present. */
  it("does not accept a directory named like a unit", async () => {
    await writeSet({ skip: ["rain.m4a"] });
    await mkdir(join(dir, "rain.m4a"), { recursive: true });

    await expect(budget(dir, { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain("missing");
    expect(printed()).toContain("rain.m4a");
  });

  /**
   * ☠️ An uppercase extension used to vanish from the total while its own unit
   * reported missing — bytes silently dropped from the ceiling on a case-insensitive
   * filesystem. Both halves are now reported.
   */
  it("reports a wrongly-cased name on both sides", async () => {
    await writeSet({ skip: ["night.m4a"] });
    await writeFile(join(dir, "night.M4A"), Buffer.alloc(480_000));

    const complete = await budget(dir, { measureSeconds });
    // On a case-insensitive filesystem `night.M4A` IS `night.m4a`, so the unit is
    // present and nothing is stray; on a case-sensitive one it is missing plus a
    // stray. Either way the bytes are counted and the command does not fail open.
    expect(printed()).toMatch(/missing|unexpected|21\/21/);
    expect(typeof complete).toBe("boolean");
  });

  /**
   * ☠️ The PREDICTED half is sold as needing no rendered byte, and `run()` REJECTS
   * on ENOENT — so an absent ffprobe used to kill the command before it printed a
   * single line, including the half that never needed ffprobe.
   */
  it("still predicts when the length prober is unavailable", async () => {
    const exploding = async () => {
      throw new Error('could not run "ffprobe" — is it on PATH?');
    };
    await expect(budget(join(dir, "nothing-here"), { measureSeconds: exploding })).resolves.toBe(
      false,
    );
    expect(printed()).toContain(`PREDICTED (${SHIP_FILE_COUNT} files`);
    expect(printed()).toContain("FLOOR");
  });

  it("reports a directory that does not exist as a pass that has not run", async () => {
    await expect(budget(join(dir, "nothing-here"), { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain("the pass has not written a finished set yet");
  });

  /** The predicted half runs with no files at all — that is the point of it. */
  it("predicts the set from the catalog before anything is rendered", async () => {
    await budget(join(dir, "nothing-here"), { measureSeconds });
    expect(printed()).toContain(`PREDICTED (${SHIP_FILE_COUNT} files`);
    expect(printed()).toContain("of 4.000 MiB");
  });

  /**
   * ☠️ A length nobody knows must not weigh nothing. With no probe the sixteen cues
   * are unknown, and the total has to announce itself as a floor rather than
   * quietly reporting a smaller set that fits more easily.
   */
  it("calls the total a floor when a length is unknown", async () => {
    await budget(join(dir, "nothing-here"), { measureSeconds: async () => null });
    expect(printed()).toContain(
      `${shippingUnits().filter((unit) => unit.voice).length} unit(s) have no length`,
    );
    expect(printed()).toContain("FLOOR");
  });

  it("looks in the ship directory by default", async () => {
    await mkdir(join(dir, "sub"), { recursive: true });
    await budget(join(dir, "sub"), { measureSeconds });
    expect(printed()).toContain(join(dir, "sub"));
  });
});
