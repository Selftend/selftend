import fs from "fs";
import path from "path";

import {
  SHIP_BUDGET_BYTES,
  SHIP_FILE_COUNT,
  shipFileName,
  shippingUnits,
} from "../scripts/audio/ship-plan.mjs";

/**
 * The 4 MiB ceiling #1138 set, enforced over the assets the app actually ships
 * (#1607).
 *
 * ⚠️ **This is a different guard from `audio-ship-budget.test.ts`, and the
 * difference is the whole point.** That file is pure functions over fixtures -
 * its own docstring says "no ffmpeg, no key, no rendered byte" - and
 * `postprocess.mjs budget` surveys `audio-masters/finished/`, which is
 * gitignored and per-worktree. Neither reads a committed byte. So the ceiling
 * was arithmetic nobody applied to the thing that ships.
 *
 * ✅ **#1210 deferred this deliberately, and the deferral has expired.** The
 * stated reason was that the guard "would fail every build until the pass has
 * run". The pass has run: 19 files, 3,578,571 bytes, 85% of the ceiling. An
 * expired deferral that nobody retires is the failure mode the suppression-list
 * rule describes - the entry dies when the condition is met, not when somebody
 * happens to notice.
 *
 * ☠️ **A ceiling on its own is a vacuous check, so three of the four tests below
 * are not about size at all.** An empty directory is comfortably under 4 MiB; so
 * is a set whose clips were all truncated to zero; so is a set where a bed was
 * renamed and silently stopped shipping. Each of those is a worse outcome than
 * being slightly over budget, and only the count, the names and the floor catch
 * them. This is the same shape as the vacuous-assertion traps recorded across
 * this repo.
 */

const SOUNDS_DIR = path.resolve(__dirname, "..", "assets", "sounds");

/**
 * Every committed file under `assets/sounds/`, not only the ones with an audio
 * extension. Everything in this tree is bundled into the app, so anything that
 * lands here spends the same budget - counting only `.m4a` would let a stray
 * export or a forgotten master sit outside the ceiling it belongs inside.
 */
function shippedFiles(): { relative: string; bytes: number }[] {
  const found: { relative: string; bytes: number }[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        found.push({
          relative: path.relative(SOUNDS_DIR, full).split(path.sep).join("/"),
          bytes: fs.statSync(full).size,
        });
      }
    }
  }

  walk(SOUNDS_DIR);
  return found.sort((a, b) => a.relative.localeCompare(b.relative));
}

/**
 * Below this, a file is a stub rather than a clip. The smallest real asset is a
 * voice cue at ~7 KB, so 1 KB is well clear of anything legitimate while still
 * catching the zero-byte and truncated-write cases a byte ceiling welcomes.
 */
const STUB_FLOOR_BYTES = 1024;

function mib(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

describe("the audio the app actually ships", () => {
  const files = shippedFiles();
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);

  /**
   * The names, checked against the plan rather than against a hardcoded list -
   * `shipFileName` is where a clip's shipped name is decided, so this catches a
   * rename on either side. ☠️ A bed that quietly stops shipping is invisible to
   * a byte ceiling, which only ever gets *happier* as files disappear.
   */
  it("ships exactly the files the plan names", () => {
    const onDisk = files.map((file) => path.posix.basename(file.relative)).sort();
    const planned = shippingUnits()
      .map((unit) => shipFileName(unit))
      .sort();

    expect(onDisk).toEqual(planned);
  });

  /**
   * The anti-vacuous assertion #1607 asked for by name. An equality rather than
   * a floor: `SHIP_FILE_COUNT` is the set's size, driven from `catalog.mjs`, so
   * a twentieth clip is a deliberate edit there and not something that should
   * slip past on a `>=`.
   */
  it("counts nineteen files, so an emptied directory cannot pass the ceiling", () => {
    expect(files).toHaveLength(SHIP_FILE_COUNT);
  });

  it("fits under the 4 MiB ceiling, and says by how much", () => {
    const heaviest = [...files].sort((a, b) => b.bytes - a.bytes)[0];
    const detail =
      `${mib(totalBytes)} of ${mib(SHIP_BUDGET_BYTES)} across ${files.length} files · ` +
      `${mib(SHIP_BUDGET_BYTES - totalBytes)} headroom · ` +
      `heaviest ${heaviest.relative} at ${mib(heaviest.bytes)}`;

    expect({ over: totalBytes > SHIP_BUDGET_BYTES, detail }).toEqual({ over: false, detail });
  });

  /**
   * A zero-length file passes every ceiling ever written. So does one truncated
   * by an interrupted write, and the app would ship silence for a bed nobody
   * can re-render - six of these masters no longer exist anywhere.
   */
  it("carries no empty or stub clip", () => {
    const stubs = files
      .filter((file) => file.bytes < STUB_FLOOR_BYTES)
      .map((file) => `${file.relative} at ${file.bytes} bytes`);

    expect(stubs).toEqual([]);
  });
});
