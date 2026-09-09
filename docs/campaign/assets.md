# Campaign asset & licensing registry

Every non-app asset used in a published campaign video is recorded here — source, terms, and
date — per [#621](https://github.com/Selftend/selftend/issues/621). App captures need no entry
(they are the project's own product, captured with the fictional demo account).

## ElevenLabs terms (checked 2026-09-02)

Every ElevenLabs row below was generated on the owner's **Creator** plan (paid; upgraded
2026-08-04, active 2026-08-20). The account is EEA-resident, so the EU text governs; its clauses
are identical to the non-EEA text. Documents read, with their own "Last Updated" dates:

- Terms of Service (EU), 2026-03-31 — <https://elevenlabs.io/terms-of-use-eu>. §1(c): a paid
  subscriber "may use the Services for commercial purposes"; §4(c)(ii): "you retain all rights in
  and to your Output"; §4(a): Output may be used outside the Services "subject to these Terms and
  our Prohibited Use Policy".
- Eleven Music Model-Specific Terms, 2026-05-26, covering Music v1 and v2 —
  <https://elevenlabs.io/eleven-music-model-specific-terms>. Holds the binding **Music Commercial
  Rights table** (a CSS grid — read the rendered page; text scrapers miss it, which is why #1131
  could not find it). Creator row: Media Rights "All online and offline commercial use permitted,
  except film, TV, radio, & Studio Games"; Attribution "No Attribution Required"; Streaming "Yes";
  Music Libraries & Repositories "Prohibited" (§5(e): a catalogue built to license to third parties).
  §2(c): Output keeps the rights of the plan in effect when it was created. Supplements the Music
  Terms, 2026-05-26 — <https://elevenlabs.io/music-terms>.
- Prohibited Use Policy, 2026-08-17 — <https://elevenlabs.io/use-policy>. §9(c) bans
  distributing or sublicensing Sound Effects Output "on a standalone basis … as isolated files,
  audio samples, music or sound, libraries, or other collections of sounds". No paid-tier carve-out.

Full research trail: [#1204](https://github.com/Selftend/selftend/issues/1204).

## Voice

| Item                                                                 | Service / voice                                                                                        | Settings                                                                                                                                                                         | License / terms                                                                                                                                                                     | Date       | Used in         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------- |
| ALL VO **v02** — trailer (T01–T10b) + all 8 walkthroughs (120 lines) | ElevenLabs — "Zara – The Warm, Real-World Conversationalist" (Professional Voice Clone, Voice Library) | Eleven Multilingual v2; speed 1.05, stability 100, similarity 100, style 0, speaker boost on; **output MP3 44.1 kHz 192 kbps** (plan upgraded 2026-08-04; WAV output needs Pro+) | Commercial use cleared — ToS §1(c), paid subscriber (Creator since 2026-08-04); output rights retained under §4(c)(ii). No attribution required on a paid plan. Checked 2026-09-02. | 2026-08-04 | all nine videos |
| _superseded:_ v01 VO takes (128 kbps, pre-upgrade)                   | same voice/settings                                                                                    | replaced by v02; full takes kept in Drive for provenance                                                                                                                         | —                                                                                                                                                                                   | 2026-08-04 | none            |

## Music / sound

| Item                                                                                                       | Source                                  | License / terms                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Date       | Used in                       |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------- |
| Trailer bed candidates ×2 — "Aura Flow", "Gentle Unfolding" (60s WAV, ambient pad w/ rising pulse + swell) | ElevenLabs Music v2, text-prompted      | Commercial use cleared — Music Commercial Rights table, Creator row: "All online and offline commercial use permitted, except film, TV, radio, & Studio Games"; a YouTube promo is none of the exceptions, and a video soundtrack is not a "Music Library & Repository". "No Attribution Required" — no "Created in collaboration with ElevenLabs" credit is owed. Rights follow the plan at creation (§2(c)), so they survive a later downgrade. Checked 2026-09-02.  | 2026-08-04 | trailer (pick one in edit)    |
| Walkthrough bed candidates ×2 — "Quiet Focus Pad", "Quiet Focus" (240s WAV, near-imperceptible pad)        | ElevenLabs Music v2, text-prompted      | Commercial use cleared — same Creator row of the Music Commercial Rights table as the trailer beds; no attribution owed. Checked 2026-09-02.                                                                                                                                                                                                                                                                                                                           | 2026-08-04 | all 8 walkthroughs (pick one) |
| UI tap ticks ×4 — `ui-tick-1..4` (2s WAV 48kHz, soft muted glass tap)                                      | ElevenLabs Sound Effects, text-prompted | Commercial use cleared under ToS §1(c) (paid plan). Accepted exposure: Prohibited Use Policy §9(c) bans distributing Sound Effects Output "on a standalone basis … as isolated files"; ticks mixed into a rendered video are not standalone files, a weaker case than the app bundle, whose §9(c) exposure the owner accepted knowingly on 2026-08-20 ([#1133](https://github.com/Selftend/selftend/issues/1133)). The same decision covers these. Checked 2026-09-02. | 2026-08-04 | tap-sync moments, all videos  |

Drive locations: `music/` and `sfx/` under the project folder, runbook naming.

## Graphics / fonts

| Item      | Source | License / terms | Date | Used in |
| --------- | ------ | --------------- | ---- | ------- |
| _pending_ |        |                 |      |         |

## Replacement log

One line per single-screen swap (see the runbook in `README.md`).

| Date | Video | Screen id | Reason | New clip version |
| ---- | ----- | --------- | ------ | ---------------- |
