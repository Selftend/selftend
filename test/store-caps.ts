// test/store-caps.ts
//
// The App Store Connect field caps, in one place because two suites now need
// them (#1944): `store-info-invariants.test.ts`, which holds the committed
// values inside them, and `positioning-copy.test.ts`, which holds
// `docs/positioning.md`'s written inventory of them in agreement with this
// object.
//
// ⚠️ It is a module rather than an export from the suite that used to own it
// because importing a `.test.ts` file runs its `describe` blocks a second time,
// nested inside the importer.

/**
 * App Store Connect's own caps, per the EAS Metadata schema
 * (https://docs.expo.dev/eas/metadata/schema/) and App Store Connect's editor.
 *
 * ⚠️ `keywords` is deliberately NOT here, and its absence is a finding rather
 * than an omission - see store/README.md. The file is a verified subset;
 * anything never read stays absent rather than guessed at.
 *
 * ☠️ **`promoText` LEFT this object on #2540, and the sibling suite's first
 * assertion is the whole argument** - it is named "commits only fields whose
 * live value was actually read", and it couples this object to
 * `store/apple-info.json`'s keys exactly. Promotional Text is **empty** in App
 * Store Connect (read 2026-09-16, 170 of 170 free), so the value committed
 * here since #1611 had never matched anything: it was the decided copy, not a
 * read one, which is the one thing store/README.md forbids. The weekly guard
 * had been reporting it as drift every Monday and there was nothing to drift
 * from.
 *
 * ⚠️ **The 170 cap and the decided copy are not lost** - both stay in
 * `docs/positioning.md` § *The short form*, which is where decisions live. This
 * object mirrors what App Store Connect actually holds. If the copy is ever
 * entered there, the field comes back here in the same change.
 *
 * ☠️ **`description` used to sit in that sentence too, and the reason was
 * wrong** (#2524). It said only the first line and second paragraph had ever
 * been captured, so committing a truncated description would turn the weekly
 * drift check red on arrival. The whole field is readable without credentials
 * from the public lookup endpoint, and the weekly pull carries it as well; the
 * real blocker was that the LIVE copy opened with the one phrase
 * `docs/positioning.md` calls unsafe. It was rewritten in App Store Connect on
 * 2026-09-16, and the committed value below is that record, so the field is a
 * read value rather than a guess like every other entry here.
 *
 * ⚠️ 4000 is a cap that does not bind. The committed text spends 970 of it,
 * and that is the point of the row rather than a note beside it: the escape
 * clause in § *The short form* - "if length is ever genuinely capped somewhere
 * new, the answer is the short form" - has no referent here, so the field
 * carries the frame sentence, which is what an uncapped surface takes.
 *
 * ☠️ **Adding a field here is half the change.** `docs/positioning.md`
 * § *The short form* writes this inventory out in prose - because "where length
 * is capped" is cited everywhere and was wrong the first time it was written
 * (#1940: the document called `subtitle` the only capped field while the very
 * next line of this object named a second). `positioning-copy.test.ts` fails if
 * a field here goes unnamed there, which is the point: the governing document
 * had no way to be wrong out loud, and every other corpus in that suite is
 * scanned *against* it.
 */
export const APP_STORE_CAPS: Record<string, number> = {
  subtitle: 30,
  description: 4000,
};
