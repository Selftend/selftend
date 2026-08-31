/**
 * Read a voice's provenance off the ElevenLabs API. Metadata only, ZERO credits.
 *
 * #1579 asks one question the Voice Library cannot answer from outside the
 * account: are the two Bulgarian ids **Library** voices or **Defaults**?
 * ElevenLabs publishes no voice IDs anywhere in its docs and `/v1/shared-voices`
 * is 401 unauthenticated, so there is no read-only path to it — the account
 * holder has to ask, and this is the asking, reduced to one command.
 *
 * ☠️ A DEFAULT IS DISQUALIFIED OUTRIGHT. Defaults expire 2026-12-31 (#1131), so a
 * `category` of `premade` means the voice cannot ship and the map needs another
 * one BEFORE anything is rendered. Finding that out after a render is the
 * expensive way round.
 *
 * ⚠️⚠️ THE KEY IS NEVER AN ARGUMENT. It is read from the environment and never
 * printed, never logged, and never echoed — because the command line IS the
 * transcript. Two keys have already been burned on this effort by the
 * `ELEVENLABS_API_KEY=... node ...` inline form, and the `!` prefix does not hide
 * it either. Set it once with `setx`, open a new terminal, run this with no
 * secret anywhere on the line.
 *
 * Usage:
 *   node scripts/audio/voice-check.mjs                 # the two Bulgarian ids
 *   node scripts/audio/voice-check.mjs <id> [<id>...]  # any other ids
 */

const API = "https://api.elevenlabs.io/v1";

/**
 * The two ids #1579 exists to settle.
 *
 * ⚠️ Deliberately NOT imported from `catalog.mjs`. They are not in `VOICES` yet
 * and must not be until this check passes — writing an unverified id into the
 * decisions file is how "we are checking this" quietly becomes "we decided this".
 */
const BULGARIAN_CANDIDATES = [
  { label: "Bulgarian female", id: "vnewfQdVVk9Y9DZWVRNm" },
  { label: "Bulgarian male", id: "NG3DzyUGmLkog1AFB5iv" },
];

/** `premade` is the API's word for a Default. Nothing else disqualifies on sight. */
const DISQUALIFYING_CATEGORY = "premade";

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error(
      "ELEVENLABS_API_KEY is not set.\n" +
        "\n" +
        "Set it ONCE in your own terminal, then open a NEW terminal (setx only\n" +
        "affects future sessions) and re-run this with no secret on the line:\n" +
        "\n" +
        '  setx ELEVENLABS_API_KEY "<the key>"\n' +
        "\n" +
        "☠️ Do NOT pass it inline as `ELEVENLABS_API_KEY=... node ...`. The command\n" +
        "   line is transcribed verbatim; two keys have been burned that way.",
    );
    process.exit(1);
  }
  return key;
}

/** One authenticated GET. Returns the parsed voice, or an error shape. */
async function getVoice(key, id) {
  const response = await fetch(`${API}/voices/${id}`, { headers: { "xi-api-key": key } });
  if (!response.ok) {
    return { error: `${response.status} ${(await response.text()).slice(0, 300)}` };
  }
  return { voice: await response.json() };
}

/**
 * What #1579 asks to be recorded, including — explicitly — the absences.
 *
 * ☠️ `notice_period` ABSENT IS THE INTERESTING ANSWER, not a missing field to
 * shrug at. A notice period is optional per voice, and a voice without one can be
 * withdrawn with NO warning at all. The map carried "30-day minimum" as a fact
 * for a while; it was never true.
 */
function report(label, id, voice) {
  const category = voice.category ?? null;
  const sharing = voice.sharing ?? null;
  const verified = voice.verified_languages ?? [];

  console.log(`\n${label} — ${id}`);
  console.log(`  name              ${voice.name ?? "(none)"}`);
  console.log(
    `  category          ${category ?? "(absent)"}` +
      (category === DISQUALIFYING_CATEGORY
        ? "   ☠️ DEFAULT — DISQUALIFIED (expires 2026-12-31, #1131)"
        : category
          ? "   ✓ not a Default"
          : ""),
  );

  if (sharing) {
    console.log(`  sharing.status    ${sharing.status ?? "(absent)"}`);
    console.log(`  public_owner_id   ${sharing.public_owner_id ?? "(absent)"}`);
    console.log(
      `  notice_period     ${sharing.notice_period ?? "(ABSENT)"}` +
        (sharing.notice_period == null
          ? "   ☠️ no notice period → withdrawal is IMMEDIATE, no warning"
          : " days"),
    );
  } else {
    console.log("  sharing           (absent) — not a shared Library voice");
  }

  if (verified.length) {
    for (const v of verified) {
      console.log(
        `  verified          ${v.language}` +
          `${v.locale ? ` (${v.locale})` : ""} on ${v.model_id}` +
          `${v.accent ? ` · accent ${v.accent}` : ""}`,
      );
    }
    // ⚠️ The render is specced on `eleven_multilingual_v2` (#1574). A voice
    // verified for Bulgarian on some OTHER model is not the same permission, and
    // it would move the model choice rather than just being a nice extra fact.
    const bg = verified.filter((v) => String(v.language).toLowerCase().startsWith("bg"));
    if (bg.length && !bg.some((v) => v.model_id === "eleven_multilingual_v2")) {
      console.log(
        "  ⚠️ Bulgarian is verified, but NOT on eleven_multilingual_v2 — " +
          "this changes the render spec's model choice (#1578).",
      );
    }
  } else {
    console.log("  verified          (none listed)");
  }

  const labels = voice.labels ?? {};
  const labelPairs = Object.entries(labels);
  console.log(
    `  labels            ${labelPairs.length ? labelPairs.map(([k, v]) => `${k}=${v}`).join(", ") : "(none)"}`,
  );

  return category === DISQUALIFYING_CATEGORY;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length ? args.map((id) => ({ label: "voice", id })) : BULGARIAN_CANDIDATES;

  const key = apiKey();
  console.log(`Reading ${targets.length} voice(s) — metadata only, no credits spent.`);

  let disqualified = 0;
  let failed = 0;
  for (const target of targets) {
    const { voice, error } = await getVoice(key, target.id);
    if (error) {
      console.log(`\n${target.label} — ${target.id}`);
      console.log(`  ☠️ lookup failed: ${error}`);
      // ☠️ A 404 is NOT "this is a Default". It means the id is not visible to
      // this account at all — unadded, withdrawn, or wrong. Recording it as a
      // category answer would settle #1579 on something it never established.
      if (error.startsWith("404")) {
        console.log(
          "     404 = not visible to this account. That is NOT the same as " +
            "'it is a Default'.\n     Add it from the Voice Library first, then re-run.",
        );
      }
      failed += 1;
      continue;
    }
    if (report(target.label, target.id, voice)) disqualified += 1;
  }

  console.log("");
  if (failed) console.log(`${failed} lookup(s) failed — see above.`);
  if (disqualified) {
    console.log(
      `☠️ ${disqualified} voice(s) are Defaults and CANNOT SHIP. ` +
        "The map needs a replacement before any render (#1131, #1579).",
    );
  }
  // Non-zero on a disqualifying answer so this can gate a script later, while a
  // clean pair exits 0 and reads as "go".
  if (disqualified || failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
