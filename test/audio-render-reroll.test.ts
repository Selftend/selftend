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

import { CREDITS_PER_SECOND } from "../scripts/audio/catalog.mjs";

/**
 * ☠️ This file drives the whole render loop - 31 takes across nine slots, each
 * one a stubbed fetch plus a real write into a temp dir - and its first test did
 * all of that inside jest's default 5000ms. Unloaded it finishes in about that,
 * which is why it has been green: the margin was wall-clock, not logic.
 *
 * Under a full-suite run the workers compete for CPU and disk and the first test
 * crosses the line, and because every later test resumes from the manifest that
 * one writes, a single timeout takes the other five down with it. That reads as
 * five broken assertions about spending, which is alarming and entirely false.
 *
 * The bound is generous on purpose. Nothing here should ever approach it - if
 * this file starts timing out again, the loop got slower and that is worth
 * knowing, which a 5000ms default could never tell you apart from a busy runner.
 */
jest.setTimeout(60_000);

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
  creditsEstimate: number;
  creditsCharged: number | null;
};

let outDir: string;
let render: (round: string, go: boolean, maxAttempts?: number) => Promise<void>;
let fetchMock: jest.Mock;
/** false makes the stubbed API answer without a `character-cost`, as some do. */
let priceCalls: boolean;

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

  priceCalls = true;
  fetchMock = jest.fn(async (_url: string, init?: { body?: string }) => {
    const seconds = JSON.parse(init?.body ?? "{}").duration_seconds ?? 0;
    return {
      ok: true,
      // Bytes the loop only ever measures and counts, never decodes.
      arrayBuffer: async () => new ArrayBuffer(4096),
      // ☠️ A Map, not a plain object — `allHeaders()` builds the row's headers with
      // `Object.fromEntries`, which needs an iterable. A bare `{ get() {} }` stub
      // makes that throw, `allHeaders` returns null, and every cost assertion below
      // would pass vacuously against a recorded `null`.
      headers: new Map<string, string>([
        ["content-type", "audio/pcm"],
        ...(priceCalls
          ? ([["character-cost", String(seconds * CREDITS_PER_SECOND)]] as [string, string][])
          : []),
      ]),
    };
  });
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
  // ☠️ MUST be reset AFTER each test, not only before. `render` signals an
  // exhausted slot by setting `process.exitCode`, and that is jest's own process:
  // left set by the last test, it makes the entire suite exit 1 while reporting
  // every test passed — `npm run verify` fails with no message anywhere. It also
  // silently voids any mutation testing of this file, since every run would exit
  // non-zero whether or not the mutation was caught.
  process.exitCode = undefined;
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

  /**
   * ☠️ WHAT THE PASS ACTUALLY COST, PER TAKE, FROM THE RESPONSE ITSELF (#1359).
   *
   * The manifest used to carry only a quote — duration x a module constant — and
   * that constant was 3.3x under the truth for a week without anything noticing,
   * because nothing ever compared it to what the API said. `character-cost` comes
   * back on every generation: exact, immediate, free. The balance endpoint is not
   * an alternative — it LAGS, and did not move at all across a real 22-credit call.
   */
  it("records what the API charged for each take, not only what it quoted", () => {
    const rows = manifest();
    const bells = rows.filter((row) => row.clip === "meditation-bell");
    const blocks = rows.filter((row) => row.clip === BROKEN);

    // 7s and 2s at the API's own rate — the two durations Round A renders.
    expect(bells.every((row) => row.creditsCharged === 7 * CREDITS_PER_SECOND)).toBe(true);
    expect(blocks.every((row) => row.creditsCharged === 2 * CREDITS_PER_SECOND)).toBe(true);

    // ⚠️ A REJECTED take is charged exactly like a kept one, so its cost is on the
    // record too — omitting it is how a pass understates an unrepeatable spend.
    expect(rows.filter((row) => !row.accepted && row.creditsCharged == null)).toHaveLength(0);

    // ⚠️ Deliberately NOT asserting `creditsEstimate === creditsCharged` here. The
    // stub prices a call with the same formula `creditsEstimate` uses, so that
    // comparison can only restate the two assertions above it — it would look like
    // a check on the quote and be a check on nothing.
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

  it("records null rather than a guess when a response carried no cost header", async () => {
    // ☠️ The alternative is falling back to the quote and calling it a charge,
    // which is how a wrong constant survives: the record would agree with itself
    // whatever the API actually did. An absent measurement is written as absent.
    priceCalls = false;
    await render("A", true, 6);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const last = manifest().at(-1);
    expect(last?.file).toBe(`${BROKEN}-c01-a06.pcm`);
    expect(last?.creditsCharged).toBeNull();
    // The quote is still there — it is what the pass was budgeted against.
    expect(last?.creditsEstimate).toBe(2 * CREDITS_PER_SECOND);
  });
});
