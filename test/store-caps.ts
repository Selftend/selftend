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
 * ⚠️ `keywords` and `description` are deliberately NOT here, and their absence
 * is the finding rather than an omission - see store/README.md. `keywords` is a
 * hidden field that cannot be read from outside App Store Connect at all, and
 * only the first line and second paragraph of `description` were ever captured.
 * Committing a truncated description would make the weekly drift check red on
 * arrival. The file is a verified subset; anything never read stays absent
 * rather than guessed at.
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
  promoText: 170,
};
