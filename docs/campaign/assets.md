# Campaign asset & licensing registry

Every non-app asset used in a published campaign video is recorded here — source, terms, and
date — per [#621](https://github.com/Selftend/selftend/issues/621). App captures need no entry
(they are the project's own product, captured with the fictional demo account).

## Voice

| Item                                                                      | Service / voice                                                                                        | Settings                                                                                                                                             | License / terms                                                                                | Date       | Used in          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- | ---------------- |
| Trailer VO (T01–T10b)                                                     | ElevenLabs — "Zara – The Warm, Real-World Conversationalist" (Professional Voice Clone, Voice Library) | Eleven Multilingual v2; speed 1.00, stability 90, similarity 80, style 0                                                                             | ⚠️ pending — confirm plan tier permits commercial use and record terms here before publication | 2026-08-04 | trailer          |
| Walkthrough VO — all 8 videos, 109 lines (GS/MJ/BG/HA/RO/RW/CB/AC series) | ElevenLabs — Zara, same voice                                                                          | English-only model (owner-selected per #639 amendment; record exact model name here); same sliders: speed 1.00, stability 90, similarity 80, style 0 | ⚠️ same pending commercial-use confirmation as above                                           | 2026-08-04 | all walkthroughs |

## Music / sound

| Item                                                                                                       | Source                                  | License / terms                                          | Date       | Used in                       |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------- | ---------- | ----------------------------- |
| Trailer bed candidates ×2 — "Aura Flow", "Gentle Unfolding" (60s WAV, ambient pad w/ rising pulse + swell) | ElevenLabs Music v2, text-prompted      | ⚠️ same pending commercial-use confirmation as the voice | 2026-08-04 | trailer (pick one in edit)    |
| Walkthrough bed candidates ×2 — "Quiet Focus Pad", "Quiet Focus" (240s WAV, near-imperceptible pad)        | ElevenLabs Music v2, text-prompted      | ⚠️ same pending confirmation                             | 2026-08-04 | all 8 walkthroughs (pick one) |
| UI tap ticks ×4 — `ui-tick-1..4` (2s WAV 48kHz, soft muted glass tap)                                      | ElevenLabs Sound Effects, text-prompted | ⚠️ same pending confirmation                             | 2026-08-04 | tap-sync moments, all videos  |

Drive locations: `music/` and `sfx/` under the project folder, runbook naming.

## Graphics / fonts

| Item      | Source | License / terms | Date | Used in |
| --------- | ------ | --------------- | ---- | ------- |
| _pending_ |        |                 |      |         |

## Replacement log

One line per single-screen swap (see the runbook in `README.md`).

| Date | Video | Screen id | Reason | New clip version |
| ---- | ----- | --------- | ------ | ---------------- |
