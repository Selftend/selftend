# Audio render pass

Tooling for replacing the app's placeholder meditation and breathing clips with
a production set, decided across [map #1130](https://github.com/Selftend/selftend/issues/1130).

**These scripts decide nothing.** Every prompt, duration, candidate count and
loudness target in `catalog.mjs` cites the ticket that fixed it. If a value
looks wrong, the argument belongs on that ticket.

## The one fact that shapes everything

**ElevenLabs Sound Effects is non-deterministic and has no `seed`.** The same
prompt returns different audio every time, and there is no re-render path. So:

- The masters **are** the source. Losing them means the set can never be
  extended in a matching style.
- Every candidate is archived, winners and rejects alike — a rejected take is
  exactly as unreproducible as a chosen one, and the judgement that rejected it
  may not survive contact with the finished set.
- The script refuses to overwrite an existing file, refuses to spend without an
  explicit `--go`, refuses to render a prompt still marked draft, and appends to
  the manifest per clip so a crash never loses the record of what was paid for.

Text to Speech _does_ have a seed, so the eight voice cues are semi-reproducible
where the thirteen sound effects permanently are not. The manifest records it.

## Running it

The key lives in the password manager (#1141) and is passed in for the run. It
is deliberately **not** a GitHub Actions or EAS secret — this is an owner-run
local script, the same shape as `DISCORD_BOT_TOKEN`.

```bash
# No credits. Confirms the plan tier and live balance, and answers the
# capability probes that #1159 needs before any real spend.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs probe

# Prints every composed prompt and the credit cost. Spends nothing.
node scripts/audio/render.mjs plan --round A

# The real thing.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs render --round A --go
```

To include the TTS format probe, also set `ELEVENLABS_PROBE_VOICE_ID` to any
Voice Library voice id.

## The two rounds

The pass splits once, at the known risk (#1134 §5).

|                                                                         | What                                              | Cost                      |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| **Round A** — [#1159](https://github.com/Selftend/selftend/issues/1159) | Two bells, 5 candidates each, plus the API probes | 45s ≈ **1,800 credits**   |
| **Round B** — [#1210](https://github.com/Selftend/selftend/issues/1210) | 5 beds, 6 texture files, 8 voice cues             | 570s ≈ **22,800 credits** |

≈**24,600 credits** total against Creator's 121,000/month.

> The map still carries #1134's older ~17,500 estimate. It is stale twice over:
> it predates #1137 adding a fifth bed and lengthening textures to 10s, and its
> bell row costs only the 7s bell, forgetting the 2s temple block.

**Round A is a gate, not just the first batch.** Generative FX models reliably
nail an attack and muddy the long tail, which is the entire character of a
meditation bell. If no candidate has a clean, smooth, monotonic decay, the bells
fall back to a non-ElevenLabs source and #1133 reopens for that one class —
before ~22,800 credits of beds are committed to an unrepeatable render.

## Two pieces of content are still undecided

`plan --round B` will warn about both, and `render` refuses to spend on the
first:

- **The `ocean` bed prompt is a draft.** #1137 added this bed after #1134 had
  written the per-clip briefs, so it is the only clip on the map with no agreed
  prompt text. The direction is fixed — wide and distant, no discrete breaking
  events, separated _by distance in the prompt_ from the close, dry
  `ocean-swell` texture so the two can be selected together. The wording in
  `catalog.mjs` follows the house style but needs sign-off.
- **The `guide_intro` wording**, left by #1136 as "TBD at render", and the two
  Voice Library voice ids, which #1136 routed to the render session on stated
  criteria (Library only — defaults expire 2026-12-31; a matched pair;
  auditioned on the shipping words, not the demo reel).

## Output

Raw output lands in `audio-masters/` at the repo root, which is **gitignored**.
Masters go to Drive `Selftend/app-audio-masters/` (#1141); the repo keeps the
prompts and `manifest.jsonl`. Only the finished `.m4a` clips under
`assets/sounds/` are ever committed.

Post-processing — the fold, loudness normalisation, true-peak limiting and AAC
encode fixed by [#1138](https://github.com/Selftend/selftend/issues/1138) — runs
in the **same session** as the render, deliberately. #1137's seam gate is an
automated wrap check plus a 10x listen on web and native, and both run on the
_post-processed_ loop. Defer post-processing and a bed failing its seam gate
would need a re-render that is no longer possible in matching style.
