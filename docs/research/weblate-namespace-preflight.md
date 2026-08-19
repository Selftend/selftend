# Weblate namespace pre-flight: the 13 untracked namespaces

Research for [#1095](https://github.com/Selftend/selftend/issues/1095) (part of #1091). Scanned all 20
namespace JSONs in `src/i18n/locales/en/` and `src/i18n/locales/bg/` with a throwaway Node script
(flatten to dot paths; a leaf = any string value; plural variants counted as separate leaves).
Date checked: 2026-08-19, on `origin/dev` (22f52bc1).

Tracked on Weblate today: `auth`, `cbt`, `common`, `errors`, `navigation`, `policies`, `settings`.
Untracked 13: `act`, `gratitude`, `habits`, `help`, `journal`, `meditation`, `modules`, `mood`,
`notifications`, `routines`, `security`, `sleep`, `timer`.

## Verdict — what fires on component creation

- **Only `act` produces error-level "Duplicated string" units.** Four base keys coexist with an
  `_other` sibling at the same path, identically in en and bg (8 flagged units per language). The
  bare key holds the singular, so the fix is a rename to `_one` (en and bg both use one/other
  plural classes, so `_one` resolves correctly at runtime with `count`). The other 12 namespaces
  are clean — no bare-plural traps anywhere else, including the 7 already tracked.
- **No en/bg key-set mismatches in any of the 20 namespaces.** Zero keys present in one language
  and missing in the other, so no untranslated/orphan units appear at creation time.
- **Cross-namespace key reuse is widespread (135 full key paths in more than one namespace), so
  translation propagation must stay OFF** when the 13 components are created — same as the
  existing 7.
- **Budget is a non-issue:** all 20 namespaces × 2 languages = **7,976 hosted strings (~5% of the
  Libre 160k figure)**; adding the 13 contributes 3,556 of those.

## 1. Bare-plural traps (error-level "Duplicated string")

Only namespace affected: **`act`** — same 4 key paths in **both** en and bg:

| Key path (in `act.json`) | Bare key holds | Sibling |
| --- | --- | --- |
| `program.statChoicePoints` | singular | `program.statChoicePoints_other` |
| `program.statDefusion` | singular | `program.statDefusion_other` |
| `program.statExpansion` | singular | `program.statExpansion_other` |
| `program.statActions` | singular | `program.statActions_other` |

All other plural families in the 20 files are properly suffixed on both sides (e.g.
`hero.entries_one`/`hero.entries_other` in `gratitude`, `journal`, `sleep` — no bare sibling).

## 2. Cross-namespace key reuse

**135 full key paths appear in more than one of the 20 namespaces** (computed over en; bg is
key-identical). This is the fact that keeps Weblate translation propagation load-bearing-OFF: with
propagation on, a translation edit to e.g. `title` in one component would overwrite six others.

Worst offenders:

| Key path | Namespaces |
| --- | --- |
| `detail.notFound` | 7 — cbt, gratitude, habits, journal, mood, routines, sleep |
| `onboarding.welcome.title` | 7 — act, gratitude, habits, journal, meditation, mood, sleep |
| `onboarding.welcome.subtitle` | 7 — act, gratitude, habits, journal, meditation, mood, sleep |
| `home.title` | 6 — act, cbt, gratitude, habits, routines, settings |
| `title` (top-level) | 6 — gratitude, journal, mood, notifications, settings, sleep |
| `detail.title` | 5 — cbt, gratitude, journal, mood, sleep |
| `feedback.deleted` | 5 — common, gratitude, journal, mood, sleep |
| `onboarding.finish.start` | 5 — gratitude, habits, journal, mood, sleep |
| `detail.confirmDelete.*` (4 keys), `detail.delete`, `detail.edit`, `detail.deleteError` | 4 each — gratitude, journal, mood, sleep |

Namespace pairs sharing the most key paths: act+cbt (31), gratitude+journal (29), mood+sleep (29),
habits+routines (24), gratitude+sleep (19). Per-namespace counts of keys that also exist elsewhere:
cbt 47, act 44, habits 39, gratitude 38, journal 36, sleep 33, mood 29, routines 24, meditation 20,
help 10, timer 6, settings 4, common 2, notifications 2; auth/errors/modules/navigation/policies/
security 0.

## 3. Budget (leaf strings and words)

en and bg have identical leaf counts in every namespace (perfect key parity).

| Namespace | Tracked | Leaves (per lang) | Words en | Words bg | Bare-plural traps | Keys shared elsewhere |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| act | no | 480 | 3,036 | 2,871 | 4 | 44 |
| auth | yes | 161 | 905 | 911 | 0 | 0 |
| cbt | yes | 1,209 | 5,722 | 5,664 | 0 | 47 |
| common | yes | 44 | 144 | 148 | 0 | 2 |
| errors | yes | 9 | 61 | 63 | 0 | 0 |
| gratitude | no | 146 | 1,083 | 1,069 | 0 | 38 |
| habits | no | 216 | 1,501 | 1,427 | 0 | 39 |
| help | no | 81 | 948 | 906 | 0 | 10 |
| journal | no | 78 | 248 | 255 | 0 | 36 |
| meditation | no | 325 | 2,029 | 1,999 | 0 | 20 |
| modules | no | 14 | 100 | 107 | 0 | 0 |
| mood | no | 112 | 459 | 460 | 0 | 29 |
| navigation | yes | 368 | 1,164 | 1,195 | 0 | 0 |
| notifications | no | 53 | 289 | 297 | 0 | 2 |
| policies | yes | 224 | 3,462 | 3,586 | 0 | 0 |
| routines | no | 144 | 651 | 664 | 0 | 24 |
| security | no | 27 | 358 | 382 | 0 | 0 |
| settings | yes | 195 | 1,138 | 1,213 | 0 | 4 |
| sleep | no | 89 | 379 | 402 | 0 | 33 |
| timer | no | 13 | 23 | 24 | 0 | 6 |
| **Total (20)** | | **3,988** | **23,700** | **23,643** | **4** | **135 distinct paths** |

- Untracked 13 subtotal: 1,778 leaves per language → **3,556 hosted strings** if all are added.
- Tracked 7 subtotal: 2,210 leaves per language → 4,420 hosted strings already on Weblate.
- **Project total: 7,976 strings across 20 namespaces × 2 languages — about 5% of the Libre
  160,000-string ceiling.** Even ×10 growth plus more languages stays comfortably inside it.

## 4. en/bg key-set mismatches

None. Every namespace has an identical flattened key set in en and bg — including plural suffixes
(no case of en `_one`/`_other` vs a bg-only `_few`/`_many`; both languages use one/other and the
files agree). Nothing will show as untranslated or orphaned at component creation.

## Recommended order

1. Rename the 4 bare `act` keys to `program.stat*_one` in en and bg **and** confirm the call sites
   pass `count` (they already must, given `_other` works today) — one small PR.
2. Create the 13 components with translation propagation OFF (project default already), en as
   source, bg as translation.
3. No other pre-work needed; budget and key parity are clean.
