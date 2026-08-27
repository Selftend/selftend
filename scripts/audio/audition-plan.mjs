/**
 * What an audition previews, and how the winner is recorded (#1346).
 *
 * Kept apart from `audition.mjs` for the same reason `take-gate.mjs` is kept
 * apart from `render.mjs`: everything here is a pure function of manifest rows,
 * so the selection, the ordering and the pick bookkeeping can be driven from
 * jest without ffmpeg on PATH and without a single rendered byte.
 *
 * ☠️ It also has to be. `postprocess.mjs` runs its CLI at the top level of the
 * module, so it carries a top-level `await` that babel's CJS transform cannot
 * compile — which is exactly why `test/audio-render-reroll.test.ts` has to mock
 * it out wholesale. Anything importing `postprocess.mjs` inherits that, so the
 * logic worth testing must not live in the file that imports it.
 *
 * ☠️ WHY AN AUDITION NEEDS TOOLING AT ALL. `render` writes headerless raw PCM
 * (`SFX_MASTER_PCM`: s16le/48k/stereo, no RIFF header). No media player opens
 * one — the same fact that stopped `postprocess` reading `render`'s output until
 * #1317. So the finished pass hands the owner ~27 files they cannot hear, and
 * #1210's acceptance checks — a 10x loop listen, a phone-speaker listen, and a
 * manifest recording the chosen candidate — have no instrument between them.
 */

/**
 * How many times a bed is repeated for the seam listen.
 *
 * #1137 fixed the gate as an automated wrap check **plus a 10x listen on web and
 * native**, because the automated half is a declared true negative on stochastic
 * material: a hard cut of noise scores 1.08-1.22x, indistinguishable from the
 * material's own broadband variation (#1296). Ten passes is the listen, and it is
 * the only instrument that catches what the ratio cannot.
 */
export const DEFAULT_REPEATS = 10;

/** Which recorded takes an audition is willing to put in front of a listener. */
export const STATUS = {
  /** Passed #1320's level gate, generated from the prompt the catalog composes today. */
  accepted: "accepted",
  /** Below the level gate, but of the current prompt — heard only under `--all`. */
  rejected: "rejected",
  /** Of a prompt since rewritten. Never reused by `render`; heard only under `--all`. */
  superseded: "superseded",
};

/**
 * Grade one manifest row against the prompt the catalog composes today.
 *
 * ☠️ The comparison is on the PROMPT, not the filename — the same rule `planSlot`
 * resumes by, and for the same reason. All 27 masters of the failed pass are
 * still on disk under names a fresh run would write, and #1316 rewrote every one
 * of the thirteen prompts that produced them (two into a different sound
 * entirely). Auditioning them as if they were this pass's candidates would put a
 * sound nobody asked for in front of the ear that is choosing.
 *
 * Rows written before #1320 carry no measurement, so they cannot be graded and
 * are superseded by construction — which is exactly what those 27 are.
 */
export function statusOf(row, prompt) {
  const graded = Number.isFinite(row.attempt) && "dbtp" in row;
  if (!graded || row.prompt !== prompt) return STATUS.superseded;
  return row.accepted ? STATUS.accepted : STATUS.rejected;
}

/**
 * The takes worth hearing for one candidate slot, in the order they were drawn.
 *
 * Default is the accepted take alone — one file per slot is what a comparison
 * between candidates actually needs. `all` widens it to everything on disk for
 * the two cases that come up:
 *
 *   - a take the level gate rejected as *quiet* (-30..-12 dBTP) may still be the
 *     right character, and it cost the same unreproducible credits;
 *   - the seven masters of the failed pass that measured usable are the only
 *     salvage there will ever be, since Sound Effects cannot be re-drawn.
 *
 * @param {{rows: Record<string, any>[], prompt: string, all?: boolean}} args
 * @returns {{row: Record<string, any>, status: string}[]}
 */
export function takesForSlot({ rows, prompt, all = false }) {
  const graded = rows.map((row) => ({ row, status: statusOf(row, prompt) }));
  const accepted = graded.filter((entry) => entry.status === STATUS.accepted);
  if (!all) return accepted;
  // Accepted first so the default pick leads, then the rest in draw order.
  const rest = graded.filter((entry) => entry.status !== STATUS.accepted);
  return [...accepted, ...rest];
}

/**
 * Every preview an audition run should produce, in listening order.
 *
 * Clip order follows the catalog rather than the manifest, so beds are heard
 * together and textures together — a comparison, not an arrival log.
 *
 * @param clips catalog clips for the round, each with `id`, `klass`, `candidates`
 * @param promptFor `(clip) => string`, the prompt the catalog composes today
 * @param history Map from `rowsBySlot(manifestRows)`
 */
export function planAudition({ clips, promptFor, history, all = false }) {
  const entries = [];
  const missing = [];

  for (const clip of clips) {
    const prompt = promptFor(clip);
    for (let candidate = 1; candidate <= clip.candidates; candidate += 1) {
      const rows = history.get(`${clip.id}|${candidate}`) ?? [];
      const takes = takesForSlot({ rows, prompt, all });
      if (!takes.length) {
        missing.push({ clipId: clip.id, candidate, drawn: rows.length });
        continue;
      }
      for (const { row, status } of takes) {
        entries.push({
          // The key a pick is recorded under. For a sound effect that is the clip
          // id itself; the voice half needs the voice too, and both halves are
          // shown on one page, so every entry carries the key rather than the page
          // guessing which shape it is holding.
          unitId: clip.id,
          clipId: clip.id,
          klass: clip.klass,
          candidate,
          attempt: Number.isFinite(row.attempt) ? row.attempt : null,
          file: row.file,
          status,
          rejectedFor: row.rejectedFor ?? null,
          dbtp: "dbtp" in row ? row.dbtp : null,
          lufs: "lufs" in row ? row.lufs : null,
          // ☠️ THE TAKE'S OWN PROMPT, NOT THE CATALOG'S. These differ for exactly
          // the superseded takes, and that difference is the only thing that can
          // later tell a stale pick from a live one: `choiceRow` records this
          // value and `outstanding` compares it back against the catalog. Writing
          // the current prompt here instead makes every pick look current — a
          // superseded take chosen under `--all` reads as settled and silently
          // ships the old take's decision, which is the precise failure
          // `outstanding` exists to prevent.
          prompt: row.prompt ?? prompt,
          currentPrompt: prompt,
        });
      }
    }
  }

  return { entries, missing };
}

/**
 * The preview filename for one entry. Distinct per attempt, so nothing collides.
 *
 * ☠️ The voice segment is not decoration. Both voices say the same four cues
 * (#1136 keeps one script for the pair deliberately, so a user never gets a
 * *content* reason to prefer a voice), so `guide_inhale` candidate 1 exists twice.
 * Without the voice in the name the second preview silently overwrites the first
 * and the matched-pair comparison becomes a clip compared against itself.
 *
 * @param {{clipId: string, candidate: number, attempt: number|null, voice?: string|null}} entry
 * @param {{repeats?: number|null}} [options] `repeats` names the tiled loop file
 */
export function previewName(entry, { repeats = null } = {}) {
  const voice = entry.voice ? `-${entry.voice}` : "";
  const candidate = `c${String(entry.candidate).padStart(2, "0")}`;
  const attempt = entry.attempt === null ? "" : `-a${String(entry.attempt).padStart(2, "0")}`;
  const loop = repeats ? `-x${repeats}` : "";
  return `${entry.clipId}${voice}-${candidate}${attempt}${loop}.m4a`;
}

// ---------------------------------------------------------------------------
// the voice half (#1210)
// ---------------------------------------------------------------------------

/**
 * ☠️ THE EIGHT VOICE CUES WERE NOT IN THE AUDITION AT ALL.
 *
 * `audition.mjs` builds its clip list from `clipsForRound`, which filters
 * `SFX_CLIPS` — the voice cues have never been in it. Round B is 21 clips and the
 * audition saw 11: `build` could not make a voice cue playable, `choose` threw on
 * a `guide_*` id, and `status` printed "Every clip in round B has a pick" with the
 * whole voice half untouched. That is #1317's "11 clips read as 19" one subsystem
 * later, and it lands on the class #1210 calls its own FIRST task — #1136 routed
 * the voice pick into the render session on the stated criterion that the pair is
 * auditioned **on the shipping words**, not on the library's demo reel, and there
 * was no instrument for that criterion.
 *
 * The unit a voice pick is made on is one cue **in one voice**, not one cue: both
 * voices ship (#1136 makes the male voice purely additive, so nothing migrates and
 * both are owed a pick).
 *
 * Cue-major order, so the matched pair is heard back to back on the same words.
 * Grouping by voice instead puts the two halves of #1136's comparison four players
 * apart.
 *
 * @param {{
 *   voices: {id: string, axis: string, voiceId: string|null}[],
 *   cues: {id: string, text: string}[],
 *   candidates: number,
 * }} args
 * @returns {{
 *   id: string, clipId: string, klass: string, voice: string, axis: string,
 *   voiceId: string|null, text: string, candidates: number,
 * }[]}
 */
export function voiceSlots({ voices, cues, candidates }) {
  return cues.flatMap((cue) =>
    voices.map((voice) => ({
      id: `${cue.id}|${voice.id}`,
      clipId: cue.id,
      klass: "voice",
      voice: voice.id,
      axis: voice.axis,
      voiceId: voice.voiceId,
      text: cue.text,
      candidates,
    })),
  );
}

/**
 * What a voice take is OF — the voice that said it and the words it said.
 *
 * This is the voice half's answer to the composed SFX prompt, and it supersedes
 * for the same two reasons: #1264 could rewrite the wording, and the voice itself
 * is picked by auditioning a shortlist on the shipping words, so takes of a voice
 * that lost must not sit among the winner's candidates.
 *
 * ⚠️ A null id — which is what the catalog ships, because #1136 deliberately left
 * the pick to the render session — must never compare equal to a rendered take's
 * real id, or an unchosen voice reads as settled.
 *
 * Human-readable on purpose: it is what the audition page prints above the
 * players, so the string that decides supersession is the one being read.
 *
 * @param {{voiceId?: string|null, text: string}} take
 * @returns {string}
 */
export function voiceIdentity({ voiceId, text }) {
  return `${voiceId ?? "(no voice chosen)"} — ${text}`;
}

/**
 * Group voice manifest rows by the slot they belong to.
 *
 * ☠️ NOT `rowsBySlot`, which keys on `clip|candidate`. Both voices say the same
 * cue, so that key collapses the male take onto the female slot — one of them
 * disappears and the other is auditioned twice.
 */
export function voiceRowsBySlot(rows) {
  const map = new Map();
  for (const row of rows) {
    // Both halves of Round B append to one manifest.
    if (row.klass !== "voice") continue;
    const key = `${row.clip}|${row.voice}|${row.candidate}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

/**
 * Grade one TTS take against the cue and voice the catalog names today.
 *
 * ☠️ THERE IS NO LEVEL GATE HERE, DELIBERATELY. #1320's usable/silent thresholds
 * exist for the seedless Sound Effects model's silent tail — a fixed prompt varies
 * 16-26 dB run to run and a dud can never be re-drawn. Text to Speech takes a
 * seed, returns a consistent level, and is re-renderable, so grading a voice take
 * by dBTP would import a rule no ticket decided onto the one class that does not
 * need it. What a voice take IS gated on happens later and by ear, plus the one
 * measurement that has always been a voice-clip rule in practice: leading silence
 * (#1134, #1138 — the four `guide_*` clips are the only files in the app that have
 * ever had any). `postprocess` measures that on the finished file.
 */
export function statusOfVoice(row, identity) {
  return voiceIdentity(row) === identity ? STATUS.accepted : STATUS.superseded;
}

/**
 * Every voice preview an audition run should produce, in listening order.
 *
 * Mirrors `planAudition` and reports its gaps the same way: a slot with no take is
 * named rather than skipped, because a silent 4-of-8 reads as a finished pass.
 *
 * @param {{
 *   slots: ReturnType<typeof voiceSlots>,
 *   history: Map<string, Record<string, any>[]>,
 *   all?: boolean,
 * }} args `slots` from `voiceSlots`, `history` from `voiceRowsBySlot`
 * @returns {{
 *   entries: Record<string, any>[],
 *   missing: {clipId: string, voice: string, candidate: number, drawn: number}[],
 * }}
 */
export function planVoiceAudition({ slots, history, all = false }) {
  const entries = [];
  const missing = [];

  for (const slot of slots) {
    const identity = voiceIdentity(slot);
    for (let candidate = 1; candidate <= slot.candidates; candidate += 1) {
      const rows = history.get(`${slot.clipId}|${slot.voice}|${candidate}`) ?? [];
      const graded = rows.map((row) => ({ row, status: statusOfVoice(row, identity) }));
      const accepted = graded.filter((entry) => entry.status === STATUS.accepted);
      const takes = all
        ? [...accepted, ...graded.filter((e) => e.status !== STATUS.accepted)]
        : accepted;

      if (!takes.length) {
        missing.push({
          clipId: slot.clipId,
          voice: slot.voice,
          candidate,
          drawn: rows.length,
        });
        continue;
      }

      for (const { row, status } of takes) {
        entries.push({
          unitId: slot.id,
          clipId: slot.clipId,
          klass: "voice",
          voice: slot.voice,
          axis: slot.axis,
          voiceId: row.voiceId ?? null,
          candidate,
          // TTS renders once per seed — there is no re-roll here, because there is
          // nothing stochastic to re-roll against.
          attempt: null,
          file: row.file,
          status,
          rejectedFor: null,
          // Not measured at render time: `render-voices` writes a container, not
          // the raw PCM the level gate reads. The finished-file numbers come from
          // the post-processing chain the audition runs.
          dbtp: null,
          lufs: null,
          // ☠️ The one field that makes this class re-renderable where the thirteen
          // sound effects permanently are not.
          seed: row.seed ?? null,
          outputFormat: row.outputFormat ?? null,
          // ☠️ THE TAKE'S OWN IDENTITY, NOT THE SLOT'S — same rule, same reason as
          // the sound-effect side: recording the current one on every entry makes a
          // pick against a superseded voice read as settled.
          prompt: voiceIdentity(row),
          currentPrompt: identity,
        });
      }
    }
  }

  return { entries, missing };
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const num = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : "—");

/**
 * The page the owner opens to do the audition.
 *
 * Deliberately one self-contained local file with relative `src` attributes and
 * no network of any kind: it is opened from disk, off a `audio-masters/` tree
 * that is gitignored, and it must keep working with no server and no build step.
 *
 * The numbers sit *beside* the player rather than replacing it. Measurement can
 * reject a bad clip and can never confirm a good one (#1159) — the level and the
 * seam ratio are there to tell the ear where to be suspicious, not to pre-empt it.
 *
 * @param {{
 *   round: string,
 *   repeats: number,
 *   results: Record<string, any>[],
 *   missing?: {clipId: string, candidate: number, drawn: number}[],
 *   choices?: Map<string, Record<string, any>>,
 * }} args
 */
export function renderIndexHtml({ round, repeats, results, missing = [], choices = new Map() }) {
  const byClip = new Map();
  for (const result of results) {
    if (!byClip.has(result.clipId)) byClip.set(result.clipId, []);
    byClip.get(result.clipId).push(result);
  }

  const sections = [...byClip.entries()].map(([clipId, rows]) => {
    const cards = rows
      .map((row) => {
        // ☠️ PER CARD, NOT PER SECTION. Both voices say the same cue, so one
        // section holds two units with two independent picks — looking the choice
        // up by clip id alone would paint the male take with the female's pick.
        const chosen = choices.get(row.unitId ?? row.clipId);
        const isChosen = chosen && chosen.file === row.file;
        const flags = [];
        if (row.status !== STATUS.accepted) {
          flags.push(
            `<span class="tag ${row.status}">${escapeHtml(row.status)}${
              row.rejectedFor ? `: ${escapeHtml(row.rejectedFor)}` : ""
            }</span>`,
          );
        }
        if (isChosen) flags.push(`<span class="tag chosen">chosen</span>`);
        if (row.ceilingBound) {
          flags.push(
            `<span class="tag warn">could not reach target without breaching -3 dBTP</span>`,
          );
        }
        if (row.error) flags.push(`<span class="tag warn">${escapeHtml(row.error)}</span>`);

        const seam = row.seam
          ? `wrap ${num(row.seam.wrapStepRatio, 2)}× · head/tail ${num(row.seam.energyDeltaRatio, 2)}×`
          : "—";
        // ⚠️ #1134's hard rule, on the finished file. In practice a voice-clip rule
        // (#1138: only the four `guide_*` files have ever carried any lead), which
        // is why it sits beside the player on the half that had no page at all.
        const edges = row.edges
          ? `lead ${num(row.edges.leadMs, 2)} ms · tail ${num(row.edges.tailMs, 2)} ms`
          : "—";
        // ⚠️ #1136: `introMs` is MEASURED from the chosen clip, never estimated.
        // This is the only place that number is put in front of the person picking.
        const length = Number.isFinite(row.durationSeconds)
          ? `${num(row.durationSeconds, 3)} s`
          : "—";
        const chooseCmd =
          `node scripts/audio/audition.mjs choose ${clipId} ${row.candidate} ` +
          `--round ${round}${row.voice ? ` --voice ${row.voice}` : ""}`;

        return `
      <article class="cand${isChosen ? " is-chosen" : ""}">
        <h3>${row.voice ? `${escapeHtml(row.voice)} · ` : ""}candidate ${row.candidate}${row.attempt === null ? "" : ` · attempt ${row.attempt}`} ${flags.join(" ")}</h3>
        ${row.preview ? `<audio controls preload="none" src="${escapeHtml(row.preview)}"></audio>` : '<p class="muted">no preview produced</p>'}
        ${
          row.loopPreview
            ? `<p class="loop">${repeats}× loop — the seam listen (#1137)</p>
        <audio controls preload="none" src="${escapeHtml(row.loopPreview)}"></audio>`
            : ""
        }
        <dl>
          <div><dt>raw</dt><dd>${num(row.dbtp)} dBTP · ${num(row.lufs)} LUFS</dd></div>
          <div><dt>finished</dt><dd>${num(row.post?.dbtp)} dBTP · ${num(row.post?.lufs)} LUFS</dd></div>
          <div><dt>gain</dt><dd>${Number.isFinite(row.gain) ? `${row.gain >= 0 ? "+" : ""}${num(row.gain, 2)} dB` : "—"}</dd></div>
          <div><dt>edges</dt><dd>${edges}</dd></div>
          <div><dt>length</dt><dd>${length}</dd></div>
          ${row.klass === "beds" ? `<div><dt>seam</dt><dd>${seam}</dd></div>` : ""}
          ${row.seed == null ? "" : `<div><dt>seed</dt><dd>${escapeHtml(row.seed)}</dd></div>`}
          <div><dt>size</dt><dd>${num(row.sizeKb)} KB</dd></div>
        </dl>
        <code>${escapeHtml(chooseCmd)}</code>
      </article>`;
      })
      .join("");

    // ⚠️ One section per CUE, not per cue-and-voice: #1136 asks for a MATCHED
    // female/male pair auditioned on the shipping words, and the two halves of that
    // comparison have to sit side by side to be a comparison at all.
    const identities = [...new Set(rows.map((row) => row.currentPrompt ?? row.prompt))];

    return `
    <section>
      <h2>${escapeHtml(clipId)} <span class="muted">${escapeHtml(rows[0].klass)}</span></h2>
      ${identities.map((identity) => `<p class="prompt">${escapeHtml(identity)}</p>`).join("")}
      <div class="cands">${cards}</div>
    </section>`;
  });

  const gaps = missing.length
    ? `<section class="gap"><h2>No take to audition</h2><ul>${missing
        .map(
          (m) =>
            `<li>${escapeHtml(m.clipId)}${m.voice ? ` (${escapeHtml(m.voice)})` : ""} candidate ${m.candidate} — ${m.drawn} row(s) on file, none of the current prompt</li>`,
        )
        .join("")}</ul></section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Round ${escapeHtml(round)} audition</title>
<style>
  :root { color-scheme: light dark; --bg: #fbfaf8; --fg: #1b1a18; --mut: #6b6862; --line: #e2ded6; --card: #fff; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #17181a; --fg: #e9e7e3; --mut: #9a968e; --line: #2e3033; --card: #1f2124; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 2rem 1.25rem 5rem; background: var(--bg); color: var(--fg);
         font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
  main { max-width: 62rem; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
  h2 { font-size: 1.1rem; margin: 2.5rem 0 .35rem; }
  h3 { font-size: .82rem; font-weight: 600; margin: 0 0 .6rem; letter-spacing: .01em; }
  .muted { color: var(--mut); font-weight: 400; }
  .prompt { color: var(--mut); font-size: .84rem; margin: 0 0 1rem; max-width: 54rem; }
  .cands { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); }
  .cand { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 1rem; }
  .cand.is-chosen { border-color: #3f7d4f; box-shadow: 0 0 0 1px #3f7d4f inset; }
  audio { width: 100%; margin-bottom: .5rem; }
  .loop { font-size: .76rem; color: var(--mut); margin: .5rem 0 .3rem; }
  dl { margin: .6rem 0 .7rem; font-size: .78rem; }
  dl div { display: flex; gap: .5rem; justify-content: space-between; padding: .12rem 0; }
  dt { color: var(--mut); }
  dd { margin: 0; font-variant-numeric: tabular-nums; }
  code { display: block; font-size: .7rem; color: var(--mut); background: var(--bg);
         border: 1px solid var(--line); border-radius: 6px; padding: .4rem .5rem; overflow-x: auto; white-space: pre; }
  .tag { display: inline-block; font-size: .66rem; font-weight: 500; padding: .1rem .4rem;
         border-radius: 4px; border: 1px solid var(--line); color: var(--mut); vertical-align: middle; }
  .tag.chosen { border-color: #3f7d4f; color: #3f7d4f; }
  .tag.warn { border-color: #a8622a; color: #a8622a; }
  .gap ul { color: var(--mut); font-size: .84rem; }
  .lede { color: var(--mut); font-size: .86rem; max-width: 46rem; }
</style>
</head>
<body>
<main>
  <h1>Round ${escapeHtml(round)} audition</h1>
  <p class="lede">Every candidate through the real #1138 chain — the file the app would ship. Beds also carry a ${repeats}× loop for the seam listen. Numbers can reject a clip; only the ear can confirm one. Listen on a phone speaker at low volume too (#1134).</p>
  ${sections.join("")}
  ${gaps}
</main>
</body>
</html>
`;
}

/**
 * A recorded pick.
 *
 * ☠️ CHOICES ARE A SEPARATE FILE, NOT A MANIFEST ROW. `planSlot` classifies any
 * row without an `attempt` and a `dbtp` as superseded, so a `chosen` row appended
 * to `manifest.jsonl` would be counted as a superseded take of that slot — quietly
 * corrupting the survey that quotes the cost of an unrepeatable spend. The record
 * that decides how much money a run costs does not get new row shapes added to it
 * by a tool that spends nothing.
 *
 * @param {{
 *   clipId: string, candidate: number, file: string, prompt: string, at: string,
 *   note?: string|null, voice?: string|null,
 * }} args
 */
export function choiceRow({ clipId, candidate, file, prompt, note = null, at, voice = null }) {
  return {
    record: "chosen",
    clip: clipId,
    // ⚠️ Present only on a voice pick. `choices.jsonl` is append-only and may
    // already hold sound-effect picks, so adding an always-present `voice: null`
    // would leave one record in two shapes for no gain.
    ...(voice ? { voice } : {}),
    candidate,
    file,
    prompt,
    note,
    at,
  };
}

/**
 * The key one pick is filed under.
 *
 * ☠️ A voice pick cannot be keyed on the clip alone. Both voices say all four
 * cues, so `guide_inhale` is owed two picks — keyed on the clip, choosing the
 * female take would mark the male one settled and half the voice set would ship
 * unheard.
 *
 * @param {{clip: string, voice?: string|null}} row
 * @returns {string}
 */
export function choiceKey({ clip, voice = null }) {
  return voice ? `${clip}|${voice}` : clip;
}

/**
 * The live pick per clip — last write wins, so re-choosing simply supersedes.
 *
 * Append-only rather than rewriting in place: a change of mind during an audition
 * is ordinary, and the trail of what was picked first is worth as much as the
 * final answer when a set is judged as a whole later.
 */
export function currentChoices(rows) {
  const byUnit = new Map();
  for (const row of rows) {
    if (row.record !== "chosen") continue;
    byUnit.set(choiceKey(row), row);
  }
  return byUnit;
}

/**
 * Which clips still need a pick before #1210's definition of done is met.
 *
 * ⚠️ A choice recorded against a prompt the catalog has since changed is NOT a
 * pick. It names a sound that is no longer being asked for, and treating it as
 * settled is how a rewritten prompt silently ships the old take's decision.
 *
 * Serves both halves of the round unchanged: a unit is identified by `id` and
 * settled by the string `promptFor` returns for it. For a sound effect those are
 * the clip id and the composed prompt; for a voice cue they are `cue|voice` and
 * `voiceIdentity`, which is what makes a pick re-open when the voice is swapped as
 * well as when the wording is.
 */
export function outstanding({ clips, promptFor, choices }) {
  return clips
    .filter((clip) => {
      const chosen = choices.get(clip.id);
      return !chosen || chosen.prompt !== promptFor(clip);
    })
    .map((clip) => clip.id);
}
