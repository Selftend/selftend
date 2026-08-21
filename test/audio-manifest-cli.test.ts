/**
 * The manifest CLI — the two behaviours the record's honesty rests on (#1210).
 *
 * ☠️ WHY THIS FILE EXISTS. The pure half of the manifest was well covered and the
 * CLI half was not, and the gap bit immediately: `--check` returned only "is the
 * committed file current", so it exited **0** against 65 gaps on a pass nobody had
 * started. Both USAGE and the README promise `write` fails "while any unit is
 * unpicked or any take unarchived"; a mode of `write` that keeps half that
 * contract is the same green-light-on-a-half-done-pass the record exists to refuse
 * (#1317's eleven-reading-as-nineteen, #1393's `status` exiting 0).
 *
 * The other behaviour pinned here is `archive`'s refusal. An attestation nobody
 * can check is worth exactly as much as the discipline behind it, so the one
 * mechanical check available — is the master actually on this disk — must never
 * be skippable.
 *
 * Drives the real commands against a scratch `AUDIO_MASTERS_DIR`, the same
 * override `test/audio-render-reroll.test.ts` uses. No credits, no ffmpeg, no key.
 */
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Static, not dynamic: jest has no --experimental-vm-modules here, and it works
// because every path in manifest.mjs is resolved lazily (import.meta.url is null
// under babel), so AUDIO_MASTERS_DIR set per-test is still honoured.
import { archive, write } from "../scripts/audio/manifest.mjs";
import { clipsForRound, composePrompt, voiceSlotSpec } from "../scripts/audio/catalog.mjs";
import { voiceIdentity, voiceSlots } from "../scripts/audio/audition-plan.mjs";

const RAIN_TEXT = "Steady, even rainfall";

/** A graded sound-effect row, with whatever prompt the caller needs it to be of. */
function sfxRow(prompt: string, over: Record<string, unknown> = {}) {
  return JSON.stringify({
    clip: "rain",
    klass: "beds",
    candidate: 1,
    attempt: 1,
    file: "rain-c01-a01.pcm",
    prompt,
    model: "eleven_text_to_sound_v2",
    outputFormat: "pcm_48000",
    durationSeconds: 30,
    promptInfluence: 0.6,
    loop: true,
    seed: null,
    bytes: 5_760_000,
    dbtp: -4.2,
    accepted: true,
    ...over,
  });
}

describe("the manifest CLI", () => {
  let dir: string;
  let log: jest.SpyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "manifest-cli-"));
    process.env.AUDIO_MASTERS_DIR = dir;
    await mkdir(join(dir, "round-B", "beds"), { recursive: true });
    log = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    log.mockRestore();
    delete process.env.AUDIO_MASTERS_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  const out = () => join(dir, "record.json");

  it("refuses to call an untouched round finished", async () => {
    // Nothing rendered, nothing picked, nothing archived. `write` still emits the
    // record — a partial record is worth having — but must not exit 0 over it.
    await expect(write("B", { out: out() })).resolves.toBe(false);
    const doc = JSON.parse(await readFile(out(), "utf8"));
    expect(doc.complete).toBe(false);
    expect(doc.totals.units).toBe(19);
  });

  it("☠️ does not green-light an unfinished pass through --check either", async () => {
    // The real bug: `--check` compared the file to itself and reported success
    // while 65 gaps stood. Writing first makes the file exactly current, so the
    // ONLY thing that can still fail the check is completeness.
    await write("B", { out: out() });
    await expect(write("B", { out: out(), check: true })).resolves.toBe(false);
    expect(log.mock.calls.flat().join("\n")).toContain("is current");
  });

  it("reports a manifest that has never been written apart from a stale one", async () => {
    await expect(write("B", { out: out(), check: true })).resolves.toBe(false);
    expect(log.mock.calls.flat().join("\n")).toContain("never been written");
  });

  it("☠️ nor does it pass a FINISHED round whose committed record has gone stale", async () => {
    // The other half of the same gate, and the half with no natural fixture: a
    // pass can be genuinely complete and the committed file still wrong, because
    // `audio-masters/` is gitignored and only this machine can tell. Completeness
    // alone would call that current; currency alone would call an untouched pass
    // finished. The check needs both, so both need a test.
    await seedCompleteRoundB();
    await archive("B", { all: true });
    await expect(write("B", { out: out() })).resolves.toBe(true);
    await expect(write("B", { out: out(), check: true })).resolves.toBe(true);

    // Now the record says something the disk no longer does.
    const doc = JSON.parse(await readFile(out(), "utf8"));
    doc.units[0].settledOn = "a prompt nobody is asking for";
    await writeFile(out(), `${JSON.stringify(doc, null, 2)}\n`);

    await expect(write("B", { out: out(), check: true })).resolves.toBe(false);
    expect(log.mock.calls.flat().join("\n")).toContain("STALE");
  });

  /**
   * Every unit of round B rendered, picked, and on disk — the only state in which
   * `write` returns true. Built from the real catalog rather than a fixture list
   * so it cannot drift from what the round actually is (19 units, both halves).
   */
  async function seedCompleteRoundB() {
    const rows: string[] = [];
    const choices: string[] = [];
    const at = "2026-08-21T12:00:00.000Z";

    for (const clip of clipsForRound("B")) {
      const prompt = composePrompt(clip.text);
      const file = `${clip.id}-c01-a01.pcm`;
      rows.push(
        JSON.stringify({
          clip: clip.id,
          klass: clip.klass,
          candidate: 1,
          attempt: 1,
          file,
          prompt,
          seed: null,
          dbtp: -6,
          accepted: true,
        }),
      );
      choices.push(
        JSON.stringify({ record: "chosen", clip: clip.id, candidate: 1, file, prompt, at }),
      );
      await mkdir(join(dir, "round-B", clip.klass), { recursive: true });
      await writeFile(join(dir, "round-B", clip.klass, file), "");
    }

    for (const slot of voiceSlots(voiceSlotSpec("B"))) {
      const file = `${slot.clipId}-${slot.voice}-c01.mp3`;
      rows.push(
        JSON.stringify({
          clip: slot.clipId,
          klass: "voice",
          voice: slot.voice,
          voiceId: slot.voiceId,
          candidate: 1,
          file,
          text: slot.text,
          seed: 1130,
        }),
      );
      choices.push(
        JSON.stringify({
          record: "chosen",
          clip: slot.clipId,
          voice: slot.voice,
          candidate: 1,
          file,
          prompt: voiceIdentity(slot),
          at,
        }),
      );
      await mkdir(join(dir, "round-B", "voice"), { recursive: true });
      await writeFile(join(dir, "round-B", "voice", file), "");
    }

    await writeFile(join(dir, "round-B", "manifest.jsonl"), `${rows.join("\n")}\n`);
    await writeFile(join(dir, "round-B", "choices.jsonl"), `${choices.join("\n")}\n`);
  }

  it("attests only a take whose master is actually on this disk", async () => {
    // ⚠️ Nothing here can read Drive, so this is the one mechanical check there
    // is. A take missing locally cannot have been uploaded from here, and an
    // attestation given for free is worth nothing.
    const prompt = composePrompt(RAIN_TEXT);
    await writeFile(
      join(dir, "round-B", "manifest.jsonl"),
      `${sfxRow(prompt)}\n${sfxRow(prompt, { candidate: 2, file: "rain-c02-a01.pcm" })}\n`,
    );
    await writeFile(join(dir, "round-B", "beds", "rain-c01-a01.pcm"), "");

    await expect(archive("B", { all: true })).resolves.toBe(false);

    const attested = (await readFile(join(dir, "round-B", "archive.jsonl"), "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    expect(attested).toHaveLength(1);
    expect(attested[0]).toMatchObject({
      record: "archived",
      file: "rain-c01-a01.pcm",
      path: "Selftend/app-audio-masters/beds/rain-c01-a01.pcm",
    });
  });

  it("does not attest the same take twice", async () => {
    const prompt = composePrompt(RAIN_TEXT);
    await writeFile(join(dir, "round-B", "manifest.jsonl"), `${sfxRow(prompt)}\n`);
    await writeFile(join(dir, "round-B", "beds", "rain-c01-a01.pcm"), "");

    await expect(archive("B", { all: true })).resolves.toBe(true);
    await expect(archive("B", { all: true })).resolves.toBe(true);
    const lines = (await readFile(join(dir, "round-B", "archive.jsonl"), "utf8"))
      .split("\n")
      .filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it("carries the archived path into the record once attested", async () => {
    const prompt = composePrompt(RAIN_TEXT);
    await writeFile(join(dir, "round-B", "manifest.jsonl"), `${sfxRow(prompt)}\n`);
    await writeFile(join(dir, "round-B", "beds", "rain-c01-a01.pcm"), "");
    await archive("B", { all: true });
    await write("B", { out: out() });

    const doc = JSON.parse(await readFile(out(), "utf8"));
    const take = doc.units.find((unit: { id: string }) => unit.id === "rain").takes[0];
    expect(take.drivePath).toBe("Selftend/app-audio-masters/beds/rain-c01-a01.pcm");
    expect(take.archivedAt).toEqual(expect.any(String));
    expect(doc.gaps.filter((gap: { kind: string }) => gap.kind === "unarchived")).toHaveLength(0);
  });

  it("joins the measured duration #1136 needs off the audition", async () => {
    // ⚠️ `introMs` is set from the MEASURED duration of the chosen `guide_intro`,
    // never an estimate — and `postprocess run` is the only producer. It used to
    // live only on the audition page, which `build` overwrites every run.
    const prompt = composePrompt(RAIN_TEXT);
    await writeFile(join(dir, "round-B", "manifest.jsonl"), `${sfxRow(prompt)}\n`);
    await mkdir(join(dir, "audition", "round-B"), { recursive: true });
    await writeFile(
      join(dir, "audition", "round-B", "audition.json"),
      JSON.stringify([
        {
          klass: "beds",
          file: "rain-c01-a01.pcm",
          durationSeconds: 30.0,
          edges: { leadMs: 0, tailMs: 0 },
        },
      ]),
    );

    await write("B", { out: out() });
    const doc = JSON.parse(await readFile(out(), "utf8"));
    expect(doc.units.find((unit: { id: string }) => unit.id === "rain").takes[0].measured).toEqual({
      durationSeconds: 30.0,
      leadMs: 0,
      tailMs: 0,
    });
  });
});
