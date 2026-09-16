import fs from "fs";
import path from "path";

import { AMBIENT_SOUNDS } from "@/src/constants/breathing-sounds";

/**
 * Every bed's declared `nominalSeconds`, checked against the bytes of the file
 * that ships — so a re-encode that changes a length can never silently drift
 * from the catalogue.
 *
 * ☠️ **`nominalSeconds` is load-bearing, not decoration.** The web loop window
 * (`docs/sound.md` §3.1.6) is `[buffer.duration − nominalSeconds,
 * buffer.duration]`. If a declared length is longer than the bed really is, the
 * window starts before the audio and every wrap plays a slice of nothing; if it
 * is shorter, every wrap clips the bed's tail. Neither shows up in a type, a
 * lint or a screen test — only in a listener's ear, weeks later.
 *
 * ✅ **Pure byte reading. No `ffprobe`, no decode, no ffmpeg in CI.** The
 * boxes below are a fixed-layout binary format; `docs/sound.md` §8 asked for
 * exactly this, and a test that needs a binary on PATH is a test that gets
 * skipped.
 */

const BREATHING_DIR = path.resolve(__dirname, "..", "assets", "sounds", "breathing");

/**
 * An ISO base-media box: four bytes of size, four of type, then the body.
 *
 * Returns the *first* child of the given type inside `[start, end)`, with
 * `body` pointing past the header. `size === 1` means the real 64-bit size
 * follows the type; `size === 0` means "to the end of the enclosing box".
 * Neither occurs in these files today, and both are handled so that an
 * encoder change producing one reports a wrong number rather than walking off
 * into the middle of a box and reading garbage.
 */
function findBox(
  buf: Buffer,
  start: number,
  end: number,
  type: string,
): { end: number; body: number } | null {
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const boxType = buf.toString("latin1", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    // A zero-or-negative step would spin forever on a malformed file.
    if (size < header) return null;
    if (boxType === type) return { end: offset + size, body: offset + header };
    offset += size;
  }
  return null;
}

/** Walk a chain of nested box types, e.g. `moov → trak → mdia → mdhd`. */
function descend(buf: Buffer, types: string[]): { end: number; body: number } {
  let box = { end: buf.length, body: 0 };
  for (const type of types) {
    const child = findBox(buf, box.body, box.end, type);
    if (!child) throw new Error(`no ${types.join("/")} box — ${type} is missing`);
    box = child;
  }
  return box;
}

/**
 * The media header: the track's timescale and its duration **in that
 * timescale**, read straight out of `moov/trak/mdia/mdhd`.
 *
 * ☠️ Version 1 moves creation/modification to 64 bits and widens `duration`,
 * shifting both fields. These beds are version 0; reading a version-1 file at
 * the version-0 offsets silently returns two unrelated integers rather than
 * failing, so the version byte is honoured rather than assumed.
 */
function readMdhd(buf: Buffer): { timescale: number; duration: number } {
  const mdhd = descend(buf, ["moov", "trak", "mdia", "mdhd"]);
  const version = buf[mdhd.body];
  const at = mdhd.body + 4 + (version === 1 ? 16 : 8);
  return {
    timescale: buf.readUInt32BE(at),
    duration: version === 1 ? Number(buf.readBigUInt64BE(at + 4)) : buf.readUInt32BE(at + 4),
  };
}

/**
 * The edit list's `media_time` — where presentation starts inside the media,
 * in the media timescale.
 *
 * ☠️☠️ **This is the whole reason the mdhd duration alone is the wrong
 * number.** AAC carries 1024 samples of encoder priming at the head of every
 * file, and `mdhd` counts them: `rain.m4a` measures 1324024/44100 =
 * **30.023220 s** for a bed authored to exactly 30 s. The 23 ms difference is
 * the priming, and it is precisely the hole §3.1.6's loop window exists to
 * skip. The edit list says how much to drop (`media_time = 1024`), so
 * `(duration − media_time) / timescale` is the authored length, exactly.
 *
 * A file with no edit list has nothing to skip, so its media time is 0.
 */
function readEditListMediaTime(buf: Buffer): number {
  const trak = descend(buf, ["moov", "trak"]);
  const edts = findBox(buf, trak.body, trak.end, "edts");
  if (!edts) return 0;
  const elst = findBox(buf, edts.body, edts.end, "elst");
  if (!elst) return 0;

  const version = buf[elst.body];
  const entries = buf.readUInt32BE(elst.body + 4);
  if (entries === 0) return 0;
  // First entry only: a multi-segment edit list would not be a single looping
  // bed, and `nominalSeconds` would be meaningless for it.
  const at = elst.body + 8;
  return version === 1 ? Number(buf.readBigInt64BE(at + 8)) : buf.readInt32BE(at + 4);
}

/** The authored length of a bed, in seconds, read entirely from its bytes. */
function measureSeconds(file: string): number {
  const buf = fs.readFileSync(path.join(BREATHING_DIR, file));
  const { timescale, duration } = readMdhd(buf);
  if (timescale === 0) throw new Error(`${file} declares a zero mdhd timescale`);
  return (duration - readEditListMediaTime(buf)) / timescale;
}

/**
 * The catalogue's own ids are the filenames — `rain` → `rain.m4a` — so this
 * mapping needs no second list to drift from. A row whose file is missing
 * throws in `measureSeconds`, which is the right outcome: a bed that stopped
 * shipping must not pass a length check.
 */
const beds = AMBIENT_SOUNDS.filter((sound) => sound.asset !== null);

describe("each ambient bed's declared nominal length", () => {
  /**
   * ☠️ The anti-vacuous assertion. Every test below is `it.each` over `beds`,
   * and `it.each([])` passes an empty suite silently — so if the catalogue's
   * shape ever changed such that the filter caught nothing, the byte checks
   * would go green having read no file at all.
   */
  it("covers all nine beds, and only the beds", () => {
    expect(beds.map((bed) => bed.id)).toEqual([
      "rain",
      "ocean",
      "stream",
      "forest",
      "night",
      "fire",
      "brown-noise",
      "pink-noise",
      "white-noise",
    ]);
    expect(AMBIENT_SOUNDS.filter((sound) => sound.asset === null).map((s) => s.id)).toEqual([
      "none",
    ]);
  });

  it.each(beds.map((bed) => [bed.id, bed.nominalSeconds] as const))(
    "%s agrees with the mdhd and edit list in its own file",
    (id, declared) => {
      // Millisecond precision: the values are exact in the file (1323000/44100
      // is 30 with no remainder), and floating-point division is not.
      expect(measureSeconds(`${id}.m4a`)).toBeCloseTo(declared as number, 3);
    },
  );

  /**
   * ⚠️ Not the same check twice. The one above would pass if every declared
   * value and every file drifted together; this one pins the three numbers
   * `docs/sound.md` §10 states, so the catalogue cannot be quietly re-authored
   * to match a bad re-encode.
   *
   * ☠️ **"Every bed is 30 s" is false**, and was a premise this spec's map
   * carried until #2437 measured it. `fire` and `stream` are folded beds — the
   * seam gate's fold fallback ran on them — and they are shorter by the fold.
   */
  it("declares 30.000 for seven beds, and the two folded beds' own lengths", () => {
    expect(Object.fromEntries(beds.map((bed) => [bed.id, bed.nominalSeconds]))).toEqual({
      rain: 30,
      ocean: 30,
      stream: 29.6,
      forest: 30,
      night: 30,
      fire: 29.52,
      "brown-noise": 30,
      "pink-noise": 30,
      "white-noise": 30,
    });
  });

  /**
   * The mutation check, standing in for the one the ticket asks be verified by
   * hand and not shipped: feed the same reader a declared value that is wrong
   * and confirm it is rejected. Without this, "the test fails when they
   * disagree" is an untested claim about a test.
   */
  it("rejects a length the file does not support", () => {
    const real = measureSeconds("rain.m4a");
    expect(real).toBeCloseTo(30, 3);
    expect(() => expect(real).toBeCloseTo(29.52, 3)).toThrow();
    // ⚠️ And the priming is not close enough to hide inside the tolerance: the
    // raw mdhd figure a naive reader would return is 30.0232, which at three
    // decimals is a different number from 30.000.
    expect(() => expect(30.02322).toBeCloseTo(30, 3)).toThrow();
  });
});
