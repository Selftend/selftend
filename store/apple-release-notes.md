# App Store release notes ("What's New in this Version")

**Decided for: v0.23.0 · Written: 2026-09-20 · Status: NOT YET SUBMITTED.**

Decided on [#2604](https://github.com/Selftend/selftend/issues/2604). This file is where the text lives so the copy gates can read it **before** it is typed into App Store Connect — it is not a mirror of a live value, and until the submission exists there is no live value to mirror.

☠️ **One attempt, and it cannot be softened afterwards.** `What's New in this Version` is **not** in the set of fields editable on an approved version ([#2597](https://github.com/Selftend/selftend/issues/2597)) — only Promotional Text, Copyright, App Review Information and the Routing App Coverage File are. So this text gets exactly one try per submission, which is the whole reason it is committed and gated here rather than composed in the console.

⚠️ **Nothing checks this against App Store Connect, and nothing can.** `eas metadata:pull`'s `en-US` block carries `description`, `keywords`, `marketingUrl`, `privacyPolicyUrl`, `screenshots`, `subtitle`, `supportUrl` and `title` — **no `releaseNotes`**. ☠️ **That is exactly why this is its own file and not a field in [`apple-info.json`](apple-info.json)**: `scripts/check-store-listing-drift.mjs` computes `ok = absent.length === 0 && drifted.length === 0` and its own comment says _"an absent field still fails"_, so committing it there would turn the weekly job red for good — the precise `promoText` defect [#2540](https://github.com/Selftend/selftend/issues/2540) has just finished removing. This file takes [`play-listing.md`](play-listing.md)'s posture instead: **read by every copy gate on every PR, checked against no console.**

## Why it says what it says

The span is **0.22.0 + 0.23.0**, and its only user-visible change is the module gate — 0.22.0 is the gate plus a Sentry alerting fix invisible to users, 0.23.0 is one documentation commit. So the removal could not be buried among other items, and no filler line was added to make it read smaller.

- **"not in this version", never "removed".** [#2446](https://github.com/Selftend/selftend/issues/2446) gates all three modules against a stated bar and expects them back, so _removed_ overclaims permanence. ⚠️ The live 0.21.0 notes do say _"The Looking back screen has been **removed**; your entries are unaffected"_ — that screen was genuinely gone. These are not, and the one-word departure is deliberate.
- **No reason and no return.** _"still being tested"_ is a word away from an unshipped-status claim; _"they will return"_ is a promise against an unscheduled bar and manufactures a future visit for a reason that is not use — the shape [ADR-0004](../docs/adr/0004-retention-by-return-not-engagement.md) and `product-principles.md` §12 both refuse. The note **states the record and stops**.
- **The second line exists because those people meet no screen at all.** [#2449](https://github.com/Selftend/selftend/issues/2449) §4 switches every module reminder off by migration, and its "no notice" ruling rested on the not-found screen being _"the meeting point"_ — which a reminder that simply stops arriving does not have. This field is the only surface that reaches them. _"Your time is kept"_ is the existing master-off phrasing, reused.
- **One locale.** App Store Connect metadata for this listing is `en-US` only (`EXPECTED_LOCALE`, read from a real pull — see [README.md](README.md)). The lookup endpoint's `['BG','EN']` is the **binary's** localizations, not the listing's, so no Bulgarian twin is owed. ⚠️ If a `bg` listing locale is ever added, this file needs one and the i18n parity tests do not reach it.

⚠️ **The rule, so a later release does not re-decide it:** a module leaving a platform is named in that platform's release notes, in the version that carries it — what is not in this version, what is kept, where it is still reachable; no reason, no return, no apology; a setting the product changed on the person's behalf gets its own line; nothing is added to make the subtraction read smaller.

## How to change it

Replace the block below wholesale — the field is **version-scoped**, so each submission gets its own text and the old one is not history worth keeping here (the published value is readable from `itunes.apple.com/lookup`'s `releaseNotes` afterwards). Update the header's version, date and status in the same edit.

☠️ **Nothing below this line may be anything but the block.** The extractor takes **every `>` line from the heading to the end of the file**, exactly as it does for `play-listing.md`, so a stray blockquote after this point is silently read as submitted release-note copy. Quote anything else in a fence.

## Verbatim, as submitted

> • CBT, ACT and DBT are not in this version. Your records are kept, and they are still in your export.
> • If you had a reminder on for one of them, it is off now. Your time is kept.
