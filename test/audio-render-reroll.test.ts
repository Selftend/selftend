/**
 * The render pass's spending loop, driven end to end against a stubbed API (#1320).
 *
 * ☠️ THIS IS THE PART THAT SPENDS MONEY. `take-gate.mjs` decides whether a take
 * is usable and is unit-tested next door; this file proves `render` actually acts
 * on that decision — that a rejected take is re-drawn, that the attempt bound is
 * enforced and stays enforced across runs, that every attempt reaches the
 * manifest, and that an exhausted slot fails the run instead of passing quietly.
 * The bug this replaces cost ~1,881 credits precisely because nothing checked
 * the loop's behaviour before it was pointed at the live API.
 *
 * The API and ffmpeg are both stubbed, so this costs nothing and needs no binary
 * on PATH. What is real: the catalog, the manifest, the filenames, the resume
 * logic and the control flow.
 */
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mockMeasure = jest.fn();

jest.mock("../scripts/audio/postprocess.mjs", () => ({
  measure: (file: string) => mockMeasure(file),
  assertFfmpeg: () => Promise.resolve(),
}));

/** Levels chosen from real measurements: duds land at -40..-47, keepers at -1..-6. */
const DUD_DBTP = -44;
const KEEPER_DBTP = -4.2;

/** The one clip whose prompt is "broken" — no take of it ever clears the gate. */
const BROKEN = "interval-temple-block";

type ManifestRow = {
  clip: string;
  candidate: number;
  attempt: number;
  file: string;
  accepted: boolean;
  rejectedFor: string | null;
  dbtp: number | null;
};

let outDir: string;
let render: (round: string, go: boolean, maxAttempts?: number) => Promise<void>;
let fetchMock: jest.Mock;

function manifest(): ManifestRow[] {
  return readFileSync(join(outDir, "round-A", "manifest.jsonl"), "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "selftend-render-"));
  process.env.AUDIO_MASTERS_DIR = outDir;
  process.env.ELEVENLABS_API_KEY = "test-key-not-a-real-one";
  // ☠️ `require`, not `await import()`. `OUT_DIR` is read once at module scope, so
  // the env has to be set before the module loads — and babel hoists every static
  // `import` above this block, while a dynamic `import()` needs
  // --experimental-vm-modules that this suite does not run with.
  ({ render } = require("../scripts/audio/render.mjs"));
});

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  process.exitCode = undefined;

  fetchMock = jest.fn(async () => ({
    ok: true,
    // Bytes the loop only ever measures and counts, never decodes.
    arrayBuffer: async () => new ArrayBuffer(4096),
    headers: { get: () => "audio/pcm" },
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  // Two duds then a keeper for every slot, so the re-roll has to actually happen
  // — except the broken clip's first candidate, which never clears the gate.
  mockMeasure.mockImplementation((file: string) => {
    const attempt = Number(/-a(\d+)\.pcm$/.exec(file)?.[1]);
    const broken = file.includes(`${BROKEN}-c01-`);
    const dbtp = !broken && attempt >= 3 ? KEEPER_DBTP : DUD_DBTP;
    return Promise.resolve({ dbtp, lufs: dbtp - 12, lra: 3, thresh: -60 });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("render re-rolls takes that come back below the gate", () => {
  it("draws again until a take clears, and fails the run on an exhausted slot", async () => {
    await render("A", true, 4);

    const rows = manifest();
    const slots = new Set(rows.map((row) => `${row.clip}|${row.candidate}`));
    expect(slots.size).toBe(10); // 2 bells x 5 candidates

    // Nine slots take three draws; the broken one burns all four.
    expect(fetchMock).toHaveBeenCalledTimes(9 * 3 + 4);
    expect(rows).toHaveLength(9 * 3 + 4);

    // ⚠️ Every attempt is recorded, rejected ones included — a rejected take cost
    // the same credits and is equally unreproducible, so omitting it would
    // understate the spend.
    expect(rows.filter((row) => row.accepted)).toHaveLength(9);
    const rejected = rows.filter((row) => !row.accepted);
    expect(rejected).toHaveLength(22);
    expect(rejected.every((row) => row.rejectedFor === "silent")).toBe(true);
    expect(rejected.every((row) => row.dbtp === DUD_DBTP)).toBe(true);

    // The bound is per slot, and the broken one hit it exactly.
    const brokenRows = rows.filter((row) => row.clip === BROKEN && row.candidate === 1);
    expect(brokenRows).toHaveLength(4);
    expect(brokenRows.some((row) => row.accepted)).toBe(false);

    // ☠️ The run fails. The previous version's silence about exactly this is what
    // let 20 unusable masters read as a finished pass.
    expect(process.exitCode).toBe(1);
  });

  it("keeps every rejected take on disk under its own name", async () => {
    const files = readdirSync(join(outDir, "round-A", "bells"));

    expect(files).toHaveLength(9 * 3 + 4);
    // Never the pre-gate name, which the failed pass's masters still occupy.
    expect(files).not.toContain("meditation-bell-c01.pcm");
    expect(files).toContain("meditation-bell-c01-a01.pcm");
    expect(files).toContain("meditation-bell-c01-a03.pcm");
    expect(files).toContain(`${BROKEN}-c01-a04.pcm`);
  });

  it("spends nothing on a re-run: filled slots are done and spent bounds stay spent", async () => {
    const before = manifest().length;

    await render("A", true, 4);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(manifest()).toHaveLength(before);
    // The exhausted slot is still a failure, not a silent pass.
    expect(process.exitCode).toBe(1);
  });

  it("refuses to widen an already-spent bound without being asked", async () => {
    // Raising --attempts is how a human deliberately buys the broken slot more
    // draws; the point is that it takes that explicit act.
    await render("A", true, 5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const brokenRows = manifest().filter((row) => row.clip === BROKEN && row.candidate === 1);
    expect(brokenRows).toHaveLength(5);
    expect(brokenRows.at(-1)?.file).toBe(`${BROKEN}-c01-a05.pcm`);
  });
});
