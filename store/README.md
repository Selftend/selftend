# Store declarations kept under version control

## What is in here

| File                  | What it mirrors                                                                  | What checks it                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apple-advisory.json` | The age-rating half of the App Store Connect record                              | `.github/workflows/store-metadata-drift.yml` weekly; `test/store-advisory-invariants.test.ts` on every PR               |
| `apple-info.json`     | App Store listing text governed by [docs/positioning.md](../docs/positioning.md) | the same weekly workflow, via `scripts/check-store-listing-drift.mjs`; `test/store-info-invariants.test.ts` on every PR |
| `play-listing.md`     | The Google Play listing text                                                     | **Nothing.** Diff and review only — see the file's own header                                                           |

The rest of this document is about `apple-advisory.json`, which came first and set the pattern; the two rules that matter apply to all three. **Read the live value, commit it, never guess** — and **never silence a check to make it green.**

✅ **The App Store Connect locale for this listing is `en-US`, and it was read, not guessed.** The drift guard had never completed a pull ([#1798](https://github.com/Selftend/selftend/issues/1798)); the first dispatched run after [#1799](https://github.com/Selftend/selftend/issues/1799) fixed it reported `Locales present in the pulled metadata: en-US` ([run 33795074521](https://github.com/Selftend/selftend/actions/runs/33795074521)). So `scripts/check-store-listing-drift.mjs` now indexes that one locale ([#1802](https://github.com/Selftend/selftend/issues/1802)) instead of asking the weaker question it had to ask while the key was unknown — _does some locale carry this value_ — which passed if the value merely moved. The constant lives at `EXPECTED_LOCALE` in that script; if a pull ever reports a different key, the guard fails as a **repository-side** problem and names the locales it did find, because updating this repo is the fix rather than editing the listing back.

⚠️ **`apple-info.json` holds two fields, not four.** [#1606](https://github.com/Selftend/selftend/issues/1606) specified `subtitle`, `description`, `keywords` and `promoText`; only `subtitle` and `promoText` could honestly be committed. `keywords` is a hidden field that **cannot be read from outside App Store Connect at all**, and only the first line and second paragraph of `description` were ever captured — committing a truncated description would turn the weekly check red on arrival, for a reason that is not drift. Both are welcome additions the moment someone reads them from the live record.

## Why this directory exists

Selftend was rated **18+ in 173 countries** for an unknown length of time, and nobody knew.

Two manual overrides — `ageRatingOverride: SEVENTEEN_PLUS` and `ageRatingOverrideV2: EIGHTEEN_PLUS` — sat on top of a `medicalOrTreatmentInformation: FREQUENT_OR_INTENSE` declaration, contradicting the app's own App Review notes, which say it "does not diagnose, treat, or provide medical advice", and contradicting `AGENTS.md`. It took a live read of App Store Connect to find them, and a grep of the whole repository for `ageRating`, `medicalOrTreatment`, `SEVENTEEN_PLUS` and `EIGHTEEN_PLUS` returned nothing at all.

The declaration existed in exactly one place — a web form — so there was no diff for anyone to review and no commit to explain why. Corrected 2026-08-14; the rating is now **13+**.

`apple-advisory.json` is the committed copy, and `.github/workflows/store-metadata-drift.yml` fails when App Store Connect stops agreeing with it.

## What `apple-advisory.json` is

The age-rating half of the `apple.advisory` block in [EAS Metadata's `store.config.json` schema](https://docs.expo.dev/eas/metadata/schema/) — the same format WikiCanvas keeps.

**It is a verified subset, not a full mirror.** The many fields that were not read are simply absent rather than guessed at. The drift check reads it as a subset accordingly: it compares the keys that are here and ignores the ones that are not. Filling in a guessed value would turn the first scheduled run red for a reason that has nothing to do with drift, which is how a guard gets muted.

⚠️ **That "verified" claim was itself untested until 2026-09-03, and one of the five keys did not survive it.** This section used to say _every_ key had been read from the live record. It could not have been checked when it was written: the file and the guard landed in the same commit ([a06ed05e](https://github.com/Selftend/selftend/commit/a06ed05e), [#1021](https://github.com/Selftend/selftend/issues/1021)), and that guard never completed a comparison for three weeks ([#1798](https://github.com/Selftend/selftend/issues/1798)). The first working run confirmed four keys against the live record and found the fifth, `developerAgeRatingInfoUrl`, committed as `https://selftend.org/faq` but live `null` ([#1803](https://github.com/Selftend/selftend/issues/1803)).

It was a guess, and the key is gone. `https://selftend.org/faq` is the value of a **different** App Store Connect field — the **Support URL**, which is `/faq` deliberately, because `https://selftend.org/support` sits inside the app's protected route group and redirects signed-out visitors, so Apple would reject it. `developerAgeRatingInfoUrl` is an unrelated, optional field on the age-rating declaration, and nothing recorded anywhere says it was ever set. Adding it to App Store Connect to make the repository right would have inverted the guard: this file follows the live record, never the other way round.

**Absence here was not a limitation of the tooling** — that possibility was ruled out before the key was dropped, and this is the one case worth reading closely, because it is what separates this key from `keywords` above. `eas metadata:pull` reads `developerAgeRatingInfoUrl` perfectly well: eas-cli maps it straight off the App Store Connect API's `ageRatingDeclarations` attributes (`AppleConfigWriter.setAgeRating`), `@expo/apple-utils` types it as a first-class attribute, and that package requests no sparse fieldsets, so nothing selectively drops it. The same pull returned `healthOrWellnessTopics: true` and `ageRatingOverrideV2: "NONE"` — both non-default, both siblings in the same JSON object — so the API is demonstrably returning that attribute group's real values. eas-cli also reads the **editable** app info (falling back to live), which is the same declaration the App Store Connect form edits. The field is readable, and it reads `null` because it is unset.

Adding a key is therefore a small, welcome change — read the real value from App Store Connect, commit it, and it is guarded from then on.

## What it is deliberately **not**

⚠️ **This is not `store.config.json`, and the name is intentional.**

`store.config.json` is the file `eas metadata:push` reads. Pushing a **partial** metadata file at an app whose submission is under review is exactly the kind of irreversible, outward-facing mistake worth designing out rather than documenting around, so the repository contains no file by that name. `store.config.json` is in `.gitignore`: the drift check pulls into it inside a throwaway CI checkout, and it never becomes a committed artifact anyone could push by accident.

**Never run `eas metadata:push` from this repository** unless someone has first pulled a complete, current `store.config.json` and reviewed every field in it.

## Checking for drift by hand

CI does this weekly, but the same check runs locally:

```sh
npx eas-cli metadata:pull --non-interactive   # writes store.config.json (gitignored)
```

Then compare `.apple.advisory` in that file against `apple-advisory.json`. Every key here should appear there with the same value.

## When App Store Connect legitimately changes

The drift check going red is not automatically a bug — it means the two copies disagree, and either could be the wrong one.

- **App Store Connect is right** (someone made a deliberate change): update `apple-advisory.json` in a PR, so the change is reviewed and the reason is in the commit message. That is the entire point of this directory.
- **The repository is right** (something changed in App Store Connect that should not have): fix it in App Store Connect. This is the case the 18+ episode was.

Do not silence the check to make it green.
