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

/**
 * The model the render is specced on (#1574), so a voice verified for its language
 * on some OTHER model can be called out rather than silently assumed equivalent.
 *
 * ☠️ This is not hypothetical: both #1579 voices are verified for Bulgarian on
 * `eleven_turbo_v2_5`, and nothing else in the tooling would have said so.
 */
const SPEC_MODEL = "eleven_multilingual_v2";

/** Which slice of the Library to page through when a voice has not been added. */
const LIBRARY_SCAN_LANGUAGE = process.env.VOICE_CHECK_LANGUAGE || "bg";
const LIBRARY_SCAN_MAX_PAGES = 12;

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

/**
 * Find a voice, whether or not the account has added it.
 *
 * ☠️☠️ `/v1/voices/{id}` ONLY SEES VOICES THE ACCOUNT ALREADY HOLDS. This script
 * shipped querying that endpoint alone and so failed on exactly the case it was
 * written for: on 2026-08-31 both #1579 ids came back
 * `400 {"code":"voice_not_found"}` — not because they were missing or Defaults,
 * but because a Voice Library voice is not in `/v1/voices` until you ADD it. Both
 * turned out to be perfectly good `professional` Library voices.
 *
 * ⚠️ And the not-found status is **400**, not 404. A 404-only branch never fires.
 *
 * So: ask the account first (an added voice carries the richer record), then fall
 * back to scanning the Library itself, which is authoritative for un-added voices.
 */
async function getVoice(key, id) {
  const own = await fetch(`${API}/voices/${id}`, { headers: { "xi-api-key": key } });
  if (own.ok) return { voice: await own.json(), source: "account" };

  const ownError = `${own.status} ${(await own.text()).slice(0, 200)}`;
  // Anything other than "no such voice here" is a real failure (401, 429, 5xx) and
  // must not be papered over by a Library scan that would report its own miss.
  if (!/voice_not_found|not_found/.test(ownError)) return { error: ownError };

  const shared = await findInLibrary(key, id);
  if (shared) return { voice: shared, source: "library" };
  return { error: `${ownError} — and not found in the Voice Library either` };
}

/**
 * Scan the shared Voice Library for one id.
 *
 * ⚠️ There is no by-id lookup for a voice you have not added, so this pages. The
 * `language` filter keeps that bounded — the Bulgarian slice is ~800 voices, well
 * inside the page budget — but an id in some other language will not be found by
 * a `bg` scan. That is why `--language` exists.
 */
async function findInLibrary(key, id, language = LIBRARY_SCAN_LANGUAGE) {
  for (let page = 0; page < LIBRARY_SCAN_MAX_PAGES; page += 1) {
    const r = await fetch(`${API}/shared-voices?page_size=100&page=${page}&language=${language}`, {
      headers: { "xi-api-key": key },
    });
    if (!r.ok) return null;
    const body = await r.json();
    const hit = (body.voices ?? []).find((v) => v.voice_id === id);
    if (hit) return hit;
    if (!body.has_more) return null;
  }
  return null;
}

/**
 * What #1579 asks to be recorded, including — explicitly — the absences.
 *
 * ☠️ `notice_period` ABSENT IS THE INTERESTING ANSWER, not a missing field to
 * shrug at. A notice period is optional per voice, and a voice without one can be
 * withdrawn with NO warning at all. The map carried "30-day minimum" as a fact
 * for a while; it was never true.
 */
function report(label, id, voice, source = "account") {
  const category = voice.category ?? null;
  // ☠️ THE TWO SOURCES SHAPE THIS DIFFERENTLY. An account record nests provenance
  // under `sharing`; a Library record carries `notice_period` and
  // `public_owner_id` at the TOP LEVEL and has no `sharing` key at all. Reading
  // only `voice.sharing` reports "(absent) — not a shared Library voice" about a
  // voice fetched *from the Library*, which is the opposite of the truth.
  const sharing = voice.sharing ?? (voice.notice_period !== undefined ? voice : null);
  const verified = voice.verified_languages ?? [];

  console.log(`\n${label} — ${id}   [${source}]`);
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
    console.log(`  public_owner_id   ${sharing.public_owner_id ?? "(absent)"}`);
    console.log(
      `  notice_period     ${sharing.notice_period ?? "(ABSENT)"}` +
        (sharing.notice_period == null
          ? "   ☠️ no notice period → withdrawal is IMMEDIATE, no warning"
          : " days"),
    );
    if (sharing.status) console.log(`  sharing.status    ${sharing.status}`);
    // ⚠️ A Library voice the account has not ADDED cannot be rendered: the render
    // call resolves ids against the account, so it dies with the same
    // `voice_not_found` this script now recovers from. Say so where it is useful.
    if (voice.is_added_by_user === false) {
      console.log(
        "  ⚠️ NOT ADDED to this account — add it from the Voice Library before " +
          "rendering, or render-voices fails on its first call.",
      );
    }
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
    // ☠️ The render is specced on `eleven_multilingual_v2` (#1574), and a voice
    // verified on some OTHER model is not the same permission. This is not
    // hypothetical — both #1579 voices verified on `eleven_turbo_v2_5`, and
    // nothing else in the tooling would have surfaced it.
    if (!verified.some((v) => v.model_id === SPEC_MODEL)) {
      const models = [...new Set(verified.map((v) => v.model_id))].join(", ");
      console.log(
        `  ☠️ verified on ${models} but NOT on ${SPEC_MODEL} — ` +
          "this is a live model decision for the render spec (#1578).",
      );
    }
  } else {
    console.log("  verified          (none listed)");
  }

  // ⚠️ Account records carry a `labels` object; Library records spread the same
  // information across flat top-level fields. Read both so neither shape reports
  // "(none)" while the data is sitting right there.
  const labelPairs = Object.entries(
    voice.labels ??
      Object.fromEntries(
        ["accent", "gender", "age", "descriptive", "use_case"]
          .map((k) => [k, voice[k]])
          .filter(([, v]) => v != null),
      ),
  );
  console.log(
    `  labels            ${labelPairs.length ? labelPairs.map(([k, v]) => `${k}=${v}`).join(", ") : "(none)"}`,
  );

  return category === DISQUALIFYING_CATEGORY;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length ? args.map((id) => ({ label: "voice", id })) : BULGARIAN_CANDIDATES;

  const key = apiKey();
  console.log(
    `Reading ${targets.length} voice(s) — metadata only, no credits spent.\n` +
      `Falling back to the '${LIBRARY_SCAN_LANGUAGE}' slice of the Voice Library for ` +
      "any voice this account has not added (set VOICE_CHECK_LANGUAGE to change).",
  );

  let disqualified = 0;
  let failed = 0;
  for (const target of targets) {
    const { voice, error, source } = await getVoice(key, target.id);
    if (error) {
      console.log(`\n${target.label} — ${target.id}`);
      console.log(`  ☠️ lookup failed: ${error}`);
      // ☠️ NOT-FOUND IS NOT "THIS IS A DEFAULT". It means the id is neither in
      // this account nor in the Library slice scanned — unadded and in another
      // language, withdrawn, or simply wrong. Recording it as a category answer
      // would settle #1579 on something it never established.
      if (/not_found/.test(error)) {
        console.log(
          "     Not found is NOT the same as 'it is a Default'. If the voice is " +
            `not Bulgarian, re-run with VOICE_CHECK_LANGUAGE set to its language.`,
        );
      }
      failed += 1;
      continue;
    }
    if (report(target.label, target.id, voice, source)) disqualified += 1;
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
