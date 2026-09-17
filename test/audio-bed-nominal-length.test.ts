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
 * ✅ **Pure byte reading. No `ffprobe`, no decode, no ffmpeg in CI.** The boxes
 * below are a fixed-layout binary format (ISO/IEC 14496-12); `docs/sound.md` §8
 * asked for exactly this, and a test that needs a binary on PATH is a test that
 * gets skipped.
 *
 * The values themselves are asserted next to the catalogue, in
 * `src/constants/breathing-sounds.test.ts`. This file is only about whether the
 * files agree with them.
 */

const BREATHING_DIR = path.resolve(__dirname, "..", "assets", "sounds", "breathing");

interface Box {
  /** First byte past this box. */
  end: number;
  /** First byte of the body, i.e. past size + type (+ any 64-bit size). */
  body: number;
}

/**
 * Every child box of the given type inside `[start, end)`.
 *
 * A box is four bytes of size, four of type, then the body. `size === 1` means
 * the real 64-bit size follows the type; `size === 0` means "to the end of the
 * enclosing box". Neither occurs in these files today, and both are handled so
 * that an encoder change producing one reports a wrong number rather than
 * walking into the middle of a box and reading garbage.
 */
function findBoxes(buf: Buffer, start: number, end: number, type: string): Box[] {
  const found: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const boxType = buf.toString("latin1", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      // The 64-bit size occupies the eight bytes after the type, so the header
      // is 16 and those bytes have to be inside the box before they are read.
      if (offset + 16 > end) break;
      size = Number(buf.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    // A zero-or-negative step would spin forever on a malformed file.
    if (size < header || offset + size > end) break;
    if (boxType === type) found.push({ end: offset + size, body: offset + header });
    offset += size;
  }
  return found;
}

function findBox(buf: Buffer, start: number, end: number, type: string): Box | null {
  return findBoxes(buf, start, end, type)[0] ?? null;
}

/** Walk a chain of nested box types, e.g. `mdia → mdhd`, from a known parent. */
function descend(buf: Buffer, from: Box, types: string[]): Box {
  let box = from;
  for (const type of types) {
    const child = findBox(buf, box.body, box.end, type);
    if (!child) throw new Error(`missing ${type} inside ${types.join("/")}`);
    box = child;
  }
  return box;
}

/**
 * The **sound** track.
 *
 * ☠️ Not "the first `trak`". An `m4a` may carry more than one track — embedded
 * cover art is a video track in exactly this position — and measuring the wrong
 * one produces a plausible number rather than an error, which is the failure
 * mode this file exists to prevent. The handler type in `mdia/hdlr` is what
 * says which is which, so it is read rather than assumed.
 */
function audioTrak(buf: Buffer): Box {
  const moov = findBox(buf, 0, buf.length, "moov");
  if (!moov) throw new Error("no moov box");

  for (const trak of findBoxes(buf, moov.body, moov.end, "trak")) {
    const hdlr = descend(buf, trak, ["mdia", "hdlr"]);
    // version (1) + flags (3) + pre_defined (4), then the four-character
    // handler type.
    if (buf.toString("latin1", hdlr.body + 8, hdlr.body + 12) === "soun") return trak;
  }
  throw new Error("no sound track");
}

/**
 * The media header: the track's timescale and its duration **in that
 * timescale**, from `mdia/mdhd`.
 *
 * ☠️ Version 1 moves creation/modification to 64 bits and widens `duration`,
 * shifting both fields. These beds are version 0; reading a version-1 file at
 * the version-0 offsets silently returns two unrelated integers rather than
 * failing, so the version byte is honoured rather than assumed.
 */
function readMdhd(buf: Buffer, trak: Box): { timescale: number; duration: number } {
  const mdhd = descend(buf, trak, ["mdia", "mdhd"]);
  const version = buf[mdhd.body];
  const at = mdhd.body + 4 + (version === 1 ? 16 : 8);
  return {
    timescale: buf.readUInt32BE(at),
    duration: version === 1 ? Number(buf.readBigUInt64BE(at + 4)) : buf.readUInt32BE(at + 4),
  };
}

/**
 * The edit list's `media_time` — where presentation starts inside the media, in
 * the media timescale.
 *
 * ☠️☠️ **This is the whole reason the mdhd duration alone is the wrong
 * number.** AAC carries 1024 samples of encoder priming at the head of every
 * file, and `mdhd` counts them: `rain.m4a` measures 1324024/44100 =
 * **30.023220 s** for a bed authored to exactly 30 s. The 23 ms difference is
 * the priming, and it is precisely the hole §3.1.6's loop window exists to
 * skip. The edit list says how much to drop (`media_time = 1024`), so
 * `(duration − media_time) / timescale` is the authored length, exactly.
 *
 * ⚠️ `media_time = −1` marks an **empty edit** — silence inserted in the
 * presentation, not an offset into the media. Subtracting it would *add* a
 * sample rather than trim one, so it is floored at zero along with the
 * no-edit-list case: nothing to skip.
 */
function readEditListMediaTime(buf: Buffer, trak: Box): number {
  const edts = findBox(buf, trak.body, trak.end, "edts");
  const elst = edts && findBox(buf, edts.body, edts.end, "elst");
  if (!elst) return 0;

  const version = buf[elst.body];
  if (buf.readUInt32BE(elst.body + 4) === 0) return 0;
  // First entry only: a multi-segment edit list would not be a single looping
  // bed, and `nominalSeconds` would be meaningless for it.
  const at = elst.body + 8;
  const mediaTime = version === 1 ? Number(buf.readBigInt64BE(at + 8)) : buf.readInt32BE(at + 4);
  return Math.max(mediaTime, 0);
}

/** What one bed's bytes say: its authored length, and the priming dropped. */
function measure(id: string): { seconds: number; primingSamples: number; rawSeconds: number } {
  const buf = fs.readFileSync(path.join(BREATHING_DIR, `${id}.m4a`));
  const trak = audioTrak(buf);
  const { timescale, duration } = readMdhd(buf, trak);
  if (timescale === 0) throw new Error(`${id}.m4a declares a zero mdhd timescale`);

  const primingSamples = readEditListMediaTime(buf, trak);
  return {
    seconds: (duration - primingSamples) / timescale,
    primingSamples,
    rawSeconds: duration / timescale,
  };
}

const CATALOGUE_SOURCE = path.resolve(__dirname, "..", "src", "constants", "breathing-sounds.ts");

/**
 * `id` → the file that row's `asset` actually requires, read out of the
 * catalogue's **source text**.
 *
 * ☠️ **Why the source and not the value.** Every check here reaches its file as
 * `${bed.id}.m4a`, which assumes a row's `asset` points at the file its id
 * names. Nothing verified that assumption: a row whose `require` pointed at the
 * wrong bed would still be measured against the id-named file and pass, so the
 * app could play `forest` for `ocean` with a green suite. The honest check is to
 * follow the `require`, and under jest that is impossible at runtime —
 * jest-expo stubs the asset registry, so every `require(".m4a")` resolves to a
 * placeholder whose `name` is the literal string `"name"`. The link exists only
 * in the source, so the source is where it gets pinned.
 */
function requiredFileById(): Record<string, string> {
  const source = fs.readFileSync(CATALOGUE_SOURCE, "utf8");

  const fileByBinding: Record<string, string> = {};
  const bindings = /const (\w+) = require\("@\/assets\/sounds\/breathing\/([\w.-]+)"\)/g;
  for (const [, binding, file] of source.matchAll(bindings)) {
    fileByBinding[binding] = file;
  }

  // ⚠️ Case-sensitive `asset:` with a word boundary, so the breath rows'
  // `inhaleAsset:` / `exhaleAsset:` cannot match.
  const fileById: Record<string, string> = {};
  const rows = /\bid: "([\w-]+)",[\s\S]{0,160}?\basset: (\w+)[,\s}]/g;
  for (const [, id, binding] of source.matchAll(rows)) {
    if (binding in fileByBinding) fileById[id] = fileByBinding[binding]!;
  }
  return fileById;
}

const beds = AMBIENT_SOUNDS.filter((sound) => sound.asset !== null);

describe("each ambient bed's file agrees with its declared length", () => {
  /**
   * ☠️ The anti-vacuous assertion. The per-bed check below is `it.each` over
   * `beds`, and `it.each([])` passes an empty suite silently — so if the
   * catalogue's shape ever changed such that the filter caught nothing, this
   * file would go green having read no bytes at all. The ids themselves are
   * pinned next to the catalogue, so only the count is asserted here.
   */
  it("reads nine beds", () => {
    expect(beds).toHaveLength(9);
  });

  it.each(beds.map((bed) => [bed.id, bed.nominalSeconds] as const))(
    "%s agrees with the mdhd and edit list in its own file",
    (id, declared) => {
      // Millisecond precision: the values are exact in the file (1323000/44100
      // is 30 with no remainder), and floating-point division is not.
      expect(measure(id).seconds).toBeCloseTo(declared, 3);
    },
  );

  /**
   * ☠️ **Each row's `asset` requires the file its id names.** Without this,
   * every check above measures a file it merely assumes is the row's own — see
   * `requiredFileById`.
   */
  it("requires, for each bed, the file its id names", () => {
    const required = requiredFileById();
    expect(Object.fromEntries(beds.map((bed) => [bed.id, required[bed.id]]))).toEqual(
      Object.fromEntries(beds.map((bed) => [bed.id, `${bed.id}.m4a`])),
    );
  });

  /**
   * The gap the reader exists to close, measured rather than asserted: the raw
   * `mdhd` figure — what a reader that stopped at one box would return — is a
   * different number from the declared length on every single bed.
   *
   * ⚠️ This is the check that would have caught `docs/sound.md` §8's original
   * instruction. It fails if someone "simplifies" `measure` by dropping the
   * edit-list read, and it fails loudly rather than drifting 23 ms.
   */
  it("differs from the raw mdhd duration by the AAC priming, on every bed", () => {
    const measured = beds.map((bed) => {
      const { primingSamples, rawSeconds } = measure(bed.id);
      return { id: bed.id, primingSamples, raw: Number(rawSeconds.toFixed(6)) };
    });

    expect(measured).toEqual(
      beds.map((bed) => ({
        id: bed.id,
        primingSamples: 1024,
        raw: Number((bed.nominalSeconds + 1024 / 44100).toFixed(6)),
      })),
    );
  });
});
