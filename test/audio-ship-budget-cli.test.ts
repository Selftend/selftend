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
 * being INCOMPLETE even when it comfortably fits. Twenty files of twenty-one is
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
import { SHIP_BUDGET_BYTES, shippingUnits } from "../scripts/audio/ship-plan.mjs";

type Unit = { id: string; clip: string; voice: string | null; file: string };

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
  async function writeSet({ skip = [] as string[], bytes = 1000, extra = [] as string[] } = {}) {
    for (const unit of shippingUnits() as Unit[]) {
      if (skip.includes(unit.file)) continue;
      await writeFile(join(dir, unit.file), Buffer.alloc(bytes));
    }
    for (const name of extra) await writeFile(join(dir, name), Buffer.alloc(bytes));
  }

  it("passes a complete set that fits", async () => {
    await writeSet();
    await expect(budget(dir, { measureSeconds })).resolves.toBe(true);
    expect(printed()).toContain("21/21 files");
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
    expect(printed()).toContain("17/21 files");
    // It still reports the byte verdict honestly — it just does not let it decide.
    expect(printed()).toContain("fits");
    expect(printed()).toContain("the set is NOT ready to ship");
    for (const file of male) expect(printed()).toContain(file);
  });

  it("refuses a complete set that is over the ceiling", async () => {
    await writeSet({ bytes: Math.ceil(SHIP_BUDGET_BYTES / 20) });

    await expect(budget(dir, { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain("21/21 files");
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

  it("counts only .m4a, so a stray master in the ship directory is not shipped bytes", async () => {
    await writeSet();
    await writeFile(join(dir, "rain-c01-a01.pcm"), Buffer.alloc(5_760_000));

    await expect(budget(dir, { measureSeconds })).resolves.toBe(true);
    expect(printed()).toContain("21/21 files");
  });

  it("reports a directory that does not exist as a pass that has not run", async () => {
    await expect(budget(join(dir, "nothing-here"), { measureSeconds })).resolves.toBe(false);
    expect(printed()).toContain("the pass has not written a finished set yet");
  });

  /** The predicted half runs with no files at all — that is the point of it. */
  it("predicts the set from the catalog before anything is rendered", async () => {
    await budget(join(dir, "nothing-here"), { measureSeconds });
    expect(printed()).toContain("PREDICTED (21 files");
    expect(printed()).toContain("of 4.000 MiB");
  });

  /**
   * ☠️ A length nobody knows must not weigh nothing. With no probe the eight cues
   * are unknown, and the total has to announce itself as a floor rather than
   * quietly reporting a smaller set that fits more easily.
   */
  it("calls the total a floor when a length is unknown", async () => {
    await budget(join(dir, "nothing-here"), { measureSeconds: async () => null });
    expect(printed()).toContain("8 unit(s) have no length");
    expect(printed()).toContain("FLOOR");
  });

  it("looks in the ship directory by default", async () => {
    await mkdir(join(dir, "sub"), { recursive: true });
    await budget(join(dir, "sub"), { measureSeconds });
    expect(printed()).toContain(join(dir, "sub"));
  });
});
