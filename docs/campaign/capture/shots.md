# Campaign shot manifest

The storyboard → capture mapping for all nine videos, under the [#623](https://github.com/Selftend/selftend/issues/623)
baseline: production web, **v0.11.1 frozen**, phone-2x Playwright recipe, seeded demo account,
light theme / default style / English. One native exception (RW-WIDGET). The trailer uses
**excerpts of walkthrough captures** — each screen is captured once, at walkthrough pace, and
the trailer takes the best seconds in the edit.

Mechanics live in the proven Drive harness (`scripts/capture-lib.js`, `capture.js` from #511):
1080x1920 viewport with the innerWidth-540 shim, cursor overlay, human-paced clicks.
Reset the demo account (`scripts/reset-demo.sql` via Management API) before every full run.
⚠️ Check before first run: the reset seed predates ACT/habit-history needs — extend it so
history views (MJ-LOOKBACK, HA-HISTORY, CB-HISTORY) have weeks of coherent fictional data,
including **a visibly missed habit day** (HA-HISTORY's storyboard centrepiece).

Every shot: verify no [#616-flagged strings](https://github.com/Selftend/selftend/issues/617)
in frame before keeping the take (notably the CBT learn-page copy).

| Shot id        | Route / surface                           | Action captured                                         | Used in                              |
| -------------- | ----------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| HOME           | `/`                                       | dashboard hold, gentle scroll                           | trailer b2, GS-1                     |
| TOOLS          | `/tools`                                  | index scroll, hover pauses                              | GS-2, MJ orientation, BG orientation |
| CHECKIN        | `/tools/mood-tracker/new`                 | pick mood, short note, save                             | trailer b3, GS-3, MJ-1               |
| JOURNAL        | `/tools/journal/new`                      | type a short entry, save                                | trailer b5, MJ-2                     |
| GRATITUDE      | `/tools/gratitude-log/new`                | three items, save                                       | MJ-3                                 |
| LOOKBACK       | `/progress` + entry lists                 | scroll history views (seeded weeks)                     | MJ-4                                 |
| BREATHE        | `/tools/breathing/new` → `session`        | configure box, run 2 full cycles                        | trailer b4, BG-1                     |
| GROUND         | `/tools/grounding/[slug]`                 | 5-senses exercise, 2–3 steps                            | BG-2                                 |
| MEDITATE       | `/tools/meditation/stages` → session log  | open a stage, log a session                             | BG-3                                 |
| HABIT-NEW      | `/tools/habits/new`                       | create "Drink a glass of water"                         | HA-1                                 |
| HABIT-LOG      | `/tools/habits/[id]/log`                  | one-tap log                                             | HA-2                                 |
| HABIT-HIST     | `/tools/habits/history`                   | pattern view incl. the missed day                       | HA-3                                 |
| ROUTINE-NEW    | `/routines/new`                           | name "Evening wind-down", add breathing + journal steps | RO-1                                 |
| ROUTINE-RUN    | `/routines/[id]`                          | play through both steps                                 | trailer b7, RO-2                     |
| ROUTINE-EDIT   | `/routines/[id]/edit`                     | reorder, rename                                         | RO-3                                 |
| NOTIF-DEFAULTS | `/notifications`                          | hold on the all-off defaults (the thesis shot)          | RW-1                                 |
| NOTIF-OPTIN    | `/notifications`                          | enable one reminder, pick a time                        | RW-2                                 |
| NOTIF-OFF      | `/notifications`                          | disable in two taps                                     | RW-4                                 |
| WIDGET         | **native Android** home screen            | add widget, tap through                                 | RW-3 — the one native capture        |
| CBT-INDEX      | `/modules/cbt`                            | section overview                                        | CB orientation                       |
| CBT-RECORD     | `/modules/cbt/new`                        | situation → feeling → thought                           | trailer b6, CB-1                     |
| CBT-EVIDENCE   | same flow, continued                      | guided evidence prompts                                 | CB-2                                 |
| CBT-BALANCED   | same flow, continued                      | balanced thought, save                                  | CB-3                                 |
| CBT-HIST       | `/modules/cbt/history` + weekly review    | glance at both                                          | CB-4                                 |
| ACT-INDEX      | `/modules/act`                            | section overview                                        | AC orientation                       |
| ACT-BULLSEYE   | `/modules/act/values/bulls-eye`           | pick a domain, place self                               | AC-1                                 |
| ACT-ANCHOR     | `/modules/act/connection/drop-anchor`     | one round                                               | AC-2                                 |
| ACT-CHOICE     | `/modules/act/choice-point/new`           | log a toward move                                       | AC-3                                 |
| ACT-COMMIT     | `/modules/act/committed-action/new`       | one small action tied to a value                        | AC-4                                 |
| TRIO           | `/` on phone + tablet + desktop viewports | stills/short holds for the platform-trio beat           | trailer b8                           |

Capture notes:

- **Segment slack:** record each shot with ≥2s of still hold at both ends — the edit needs
  trim room, and the walkthrough VO lines run 2–7s each.
- **NOTIF-OPTIN:** the browser permission dialog is chrome, not page — grant notification
  permission at the Playwright context level and let the in-app confirmation carry the moment;
  the real OS prompt appears only in the native WIDGET session if wanted.
- **Known interaction traps (#511):** tour tips, reminder prompts, and the routine FAB can
  intercept clicks — dismiss or click around them; the harness has fallbacks.
- **Naming:** `<SHOT-ID>-vNN.webm` into Drive `captures/<video>/`, logged per the runbook.
