# What App Store Connect actually permits at this submission

Research for [What App Store Connect actually permits at this submission: 2.3.3, which metadata is editable on an approved version, and the required screenshot and app-preview sets](https://github.com/Selftend/selftend/issues/2597), under map [#2595](https://github.com/Selftend/selftend/issues/2595).

**Every fact below was checked 2026-09-18** against Apple's own documentation only — the [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [App Store Connect Help](https://developer.apple.com/help/app-store-connect/), and the [App Store Connect API reference](https://developer.apple.com/documentation/appstoreconnectapi). No blog, forum thread or third-party write-up was used, and where Apple does not document something, this file says so rather than inferring it. Apple edits these pages without notice — re-check before acting on a date-sensitive claim.

This document **does not make the calls**. It feeds the screenshot ruling, the review-doc ruling and the sequencing ticket.

---

## Fact 1 — 2.3.3 binds screenshots, 2.3.4 binds previews, and neither reaches the reviewer attachment

### The verbatim text

> **2.3.3** Screenshots should show the app in use, and not merely the title art, login page, or splash screen. They may also include text and image overlays (e.g. to demonstrate input mechanisms, such as an animated touch point or Apple Pencil) and show extended functionality on device, such as Touch Bar.

That is the whole of 2.3.3. Three things follow directly from the wording.

**It says "Screenshots", not previews.** Previews get their own clause:

> **2.3.4** Previews are a great way for customers to see what your app looks like and what it does. To ensure people understand what they'll be getting with your app, previews may only use video screen captures of the app itself. Stickers and iMessage extensions may show the user experience in the Messages app. You can add narration and video or textual overlays to help explain anything that isn't clear from the video alone.

So a preview video is bound by **2.3.4**, not 2.3.3. 2.3.4's requirement is about _provenance_ — the footage must be a screen capture of the app itself — not about which features it shows.

**2.3.3 is not itself an accuracy rule.** It is a "show the app working" rule. The accuracy obligation lives one level up, in the unnumbered lead-in to section 2.3, which does name previews explicitly:

> **2.3 Accurate Metadata** — Customers should know what they're getting when they download or buy your app, so make sure all your app metadata, including privacy information, your app description, screenshots, and previews accurately reflect the app's core experience and remember to keep them up-to-date with new versions.

That lead-in is the clause a stale public screenshot or preview would actually violate — "accurately reflect the app's core experience", "keep them up-to-date with new versions". Citing 2.3.3 for a stale screenshot is citing the wrong number.

**Neither clause mentions App Review Information.** The whole of section 2.3 concerns _metadata_ — the product page and the store listing. Nothing in 2.3.1 through 2.3.13 refers to the review notes, the demo account, or the attachment. Apple keys 2.3 to what customers see; the lead-in's subject is literally "Customers".

Source: [App Review Guidelines § 2.3](https://developer.apple.com/app-store/review/guidelines/), checked 2026-09-18.

### What does govern the reviewer-facing material

Two guidelines, and both push in the opposite direction from 2.3.3 — they demand _completeness towards the reviewer_, not restraint in marketing:

> **2.1(a)** Submissions to App Review, including apps you make available for pre-order, should be final versions with all necessary metadata and fully functional URLs included; placeholder text, empty websites, and other temporary content should be scrubbed before submission. […] include demo account info (and turn on your back-end service!) if your app includes a login. If you are unable to provide a demo account due to legal or security obligations, you may include a built-in demo mode in lieu of a demo account with prior approval by Apple. Ensure the demo mode exhibits your app's full features and functionality.

> **2.3.1(a)** Don't include any hidden, dormant, or undocumented features in your app; your app's functionality should be clear to end users and App Review. All new features, functionality, and product changes must be described with specificity in the Notes for Review section of App Store Connect (generic descriptions will be rejected) and accessible for review.

Note what 2.3.1(a) actually requires: that **new** features and product changes be described with specificity, and be reachable. It says nothing about a reviewer aid that describes something the build no longer contains.

Source: [App Review Guidelines § 2.1, § 2.3.1](https://developer.apple.com/app-store/review/guidelines/), checked 2026-09-18.

### And App Store Connect says the reviewer material is private and always editable

The App Store Connect Help reference for App Review Information opens with:

> You must provide the following information to App Review. It isn't visible to customers and can be edited at any time.

The page documents three fields: **Contact** (name, email, phone — required), **Notes** (up to 4000 bytes, any language), and **Sign-in required** (username and password, required if the app needs a login). The corroborating reference table lists `App review information` as **Required ✓** and **Editable ✓**, where that page defines its own "Editable" column as:

> The tables also indicate the properties that can be localized and edited at any time without submitting a new version of your app.

Sources: [Platform version information — App Review Information](https://developer.apple.com/help/app-store-connect/reference/app-review-information/), [Required, localizable, and editable properties](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/), both checked 2026-09-18.

⚠️ **Open question — Apple does not document the Attachment field in App Store Connect Help.** The help reference above lists only Contact, Notes and Sign-in required. The attachment is documented only in the API reference, as [App Store review attachments](https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-attachments) — _"Manage the attachments you upload to App Store Connect for App Review."_ Its endpoints hang off `appStoreReviewDetails` (the App Review Information record) and include `POST`, `PATCH` and `DELETE`, which places the attachment inside the same record the help page calls private and editable at any time. Apple never states the accepted file types or size ceiling for it in either place. Checked 2026-09-18.

### The ruling this supports

`selftend-0.11.1-build6-review.mp4` is **not a 2.3.3 exposure**. It is not a screenshot, it is not an app preview, it is not on the product page, and no clause in section 2.3 reaches it. It sits in a record Apple documents as _"isn't visible to customers and can be edited at any time"_ — replaceable today, on the live version, with no new build and no submission.

If it is a problem, the problem is 2.1(a)/2.3.1(a) shaped: a reviewer who is handed a recording of a module the submitted build does not contain will go looking for that module. That is a completeness and clarity risk, and the fix is the cheapest fix on the whole map — edit the field.

---

## Fact 2 — screenshots are in the locked set. The editable set on a live version is small and named.

Apple states it in one sentence, on the page that owns the behaviour:

> Once your app is submitted for review and approved, you must create a new version to update the screenshots.

And for taking images away rather than replacing them:

> You can remove screenshots and app previews only when the app status is editable.

Sources: [Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/), [Remove app previews or screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/remove-app-previews-or-screenshots/), checked 2026-09-18.

_Ready for Distribution_ is not an editable status. Apple's status reference carries an explicit **Editable** column, and only four statuses are ticked in it:

| Status                                                                                                                     | Editable                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Prepare for Submission                                                                                                     | ✓                                                                                                    |
| Ready for Review                                                                                                           | ✓ — _"Images and videos aren't editable in this state."_                                             |
| Invalid Binary                                                                                                             | ✓                                                                                                    |
| Waiting for Review                                                                                                         | ✓ — _"Edit certain app information. However, you can't upload or edit screenshots or app previews."_ |
| In Review, Accepted, Pending Developer Release, Ready for Distribution, Rejected, Metadata Rejected, Developer Rejected, … | (not ticked)                                                                                         |

Note that even two of the four _editable_ statuses carve screenshots out by name. Screenshots are the most locked field on the page.

Source: [App and submission statuses](https://developer.apple.com/help/app-store-connect/reference/app-and-submission-statuses), checked 2026-09-18.

### What is editable without a new version

Apple's reference table, read directly from the page (its "Editable" column means _edited at any time without submitting a new version_):

| Platform version property            | Required         | Localized | Editable                                                                              |
| ------------------------------------ | ---------------- | --------- | ------------------------------------------------------------------------------------- |
| Support URL                          | ✓                | ✓         | —                                                                                     |
| Marketing URL                        | —                | ✓         | —                                                                                     |
| Version Number                       | ✓                | —         | —                                                                                     |
| **Copyright**                        | ✓                | —         | **✓**                                                                                 |
| Routing App Coverage File            | —                | —         | ✓                                                                                     |
| **App review information**           | ✓                | —         | **✓**                                                                                 |
| Version Release Settings             | ✓                | —         | —                                                                                     |
| What's New in this Version           | ✓ (updates only) | ✓         | —                                                                                     |
| Phased Release for Automatic Updates | ✓ (updates only) | —         | ✓ (pausable within the seven-day window; can't be changed once released to all users) |

App-level properties (`Name`, `Subtitle`, `Primary Category`) are also **not** editable; only `License Agreement`, `Primary Language`, availability toggles, `DSA Status` and `Regulated Medical Devices` are.

**Promotional Text** does not appear in either table, which is a gap in Apple's own reference. Its editability is documented on its field description instead:

> Promotional text lets you inform your App Store visitors of any current app features without requiring an updated submission. This text will appear above your description on the App Store for customers with devices running iOS 11 or later. This property can't be longer than 170 characters.

**Description**, **Keywords**, **Screenshots** and **App Previews** likewise do not appear in the editable tables, and each is documented as _"required and can be localized"_ with no editability statement. For screenshots the gap is closed by the explicit sentence quoted at the top of this section.

Sources: [Required, localizable, and editable properties](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/), [Platform version information](https://developer.apple.com/help/app-store-connect/reference/platform-version-information/), checked 2026-09-18.

This **confirms** the console reading recorded in #2580 (Promotional Text and Copyright editable, everything else disabled), and adds the two fields the console could not show: **App Review Information is also editable**, and **screenshots are not**.

### A new version needs a build

> When you create a new version, the metadata from the current version is automatically transferred to the new version.

The documented procedure includes _"Upload your new build to App Store Connect"_, and the submission prerequisites are _"provide required metadata"_ plus _"choose the build — select the correct build for the version you're submitting."_ Apple documents no metadata-only version submission for iOS.

Sources: [Create a new version](https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version/), [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/), checked 2026-09-18.

---

## Fact 3 — one iPhone set and one iPad set, one to ten images each

### Counts

> You can upload one to 10 screenshots in `.jpeg`, `.jpg`, and `.png` formats, with the following specifications.
>
> **Note:** Images can't include alpha channels or transparencies.

For previews:

> Providing an app preview is optional. You can upload up to three app previews per supported device size and language for iOS, macOS, tvOS, and visionOS apps.

So the floor is **1** and the ceiling is **10** per display size per localization. There is no minimum above one, and no obligation to fill the set.

Sources: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/), checked 2026-09-18.

### Which sets are required

Apple expresses the requirement per row, and only two rows in the whole iOS table carry one:

| Row             | Requirement cell, verbatim                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| iPhone **6.5"** | _"Required if app runs on iPhone and screenshots for 6.9" display aren't provided"_ |
| iPad **13"**    | _"Required if app runs on iPad"_                                                    |

Every other iPhone and iPad row carries no requirement at all, only a scaling note of the form _"If screenshots with the accepted sizes aren't provided, scaled screenshots for [larger size] are used."_ The 6.9" row itself carries no requirement cell — its status is implied by the 6.5" row: **providing 6.9" satisfies iPhone**, and 6.5" is the fallback if you don't.

So for an iPhone+iPad universal app the required minimum is **one 6.9" iPhone set (or a 6.5" set instead) and one 13" iPad set**, each of at least one image. Everything else scales down automatically:

> If your app's user interface is the same across multiple device sizes and localizations, provide only the highest resolution screenshots required. They automatically scale down to smaller device sizes.

Current pixel sizes — 6.9": 1290 × 2796, 1320 × 2868 or 1260 × 2736 portrait; 13": 2064 × 2752 or 2048 × 2732 portrait.

⚠️ A new **iPhone Duo** row now sits above 6.9" in the table, carrying the note _"Support for uploading assets for this device in App Store Connect will be available later this year."_ It is not yet a requirement, and it is a thing to re-check before the next submission after this one.

Source: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), checked 2026-09-18.

### Can a set be shortened from 8 to 6 without re-uploading the rest?

**Yes as an operation, no as a shortcut past the version lock.** Apple documents deletion as a per-image action:

> Hold the pointer over the screenshot or app preview that you want to delete, and then click on the Delete button (–).
>
> Once the screenshot or app preview is deleted, it'll also be deleted in all other locations.

Nothing requires re-uploading the survivors — you delete the two you don't want and the remaining six stay. But the same page's first line is the constraint that matters: _"You can remove screenshots and app previews only when the app status is editable."_ Shortening a set is exactly as gated as replacing one.

⚠️ Read the second sentence carefully before deleting anything: **deletion propagates to "all other locations"** — Apple does not spell out whether that means other localizations, other device sizes fed by scaling, or both. Assume it removes the image everywhere and plan the set as a whole, not per-locale.

Source: [Remove app previews or screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/remove-app-previews-or-screenshots/), checked 2026-09-18.

### Does dropping the iPad set require dropping iPad support in the binary?

⚠️ **Not settled by a primary source — record it as an open question.** The only sentence Apple provides is the requirement cell: _"Required if app runs on iPad."_ Apple does not document anywhere in App Store Connect Help how "runs on iPad" is determined, whether it is read from the uploaded build's supported device families or set on the listing, or what App Store Connect does at submission if an iPad-capable build has no iPad set.

What the wording does say plainly is that the iPad set is **not optional for an app that runs on iPad**. Treating the iPad set as a listing-level choice that can simply be emptied is an assumption, not a documented fact. If the map needs to drop the iPad set, the documented route is to stop the app running on iPad — and the cost and reversibility of that is a separate question this file does not answer.

---

## Fact 4 — nothing in the guidelines forbids withdrawing a feature

Searched section by section. Apple addresses _removal of functionality_ in exactly one place, and it is about payment models, not feature scope:

> **3.1.2(a)** If you are changing your existing app to a subscription-based business model, you should not take away the primary functionality existing users have already paid for. For example, let customers who have already purchased a "full game unlock" continue to access the full game after you introduce a subscription model for new customers.

Selftend is free and has no in-app purchases, so 3.1.2(a) does not apply.

There is no clause anywhere in the guidelines that requires an update to retain what the previous version shipped, no clause requiring removals to be justified in the review notes, and no documented rejection reason for "this version does less than the last one". The ruling in #2451 — that both stores **forbid over-claiming, not omitting** — reads correctly for Apple, confirmed against the current guideline text on 2026-09-18.

Two real constraints do sit nearby, and neither is a removal rule:

- **4.2 Minimum Functionality** — _"Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store. If your App doesn't provide some sort of lasting entertainment value or adequate utility, it may not be accepted."_ Removing enough is a 4.2 exposure. Removing a module from a multi-tool app is not.
- **App Store Improvements** — _"apps that no longer function as intended, don't follow current review guidelines, or are outdated"_ are removed, with 90 days to submit an update. This targets abandonment and breakage, and Apple's page does not address developer-initiated feature removal at all.

### Release notes that describe a removal

The obligation is 2.3.12, and it is about _describing changes_, not about what the changes may be:

> **2.3.12** Apps must clearly describe new features and product changes in their "What's New" text. Simple bug fixes, security updates, and performance improvements may rely on a generic description, but more significant changes must be listed in the notes.

A removal is a "product change" and a "significant change" on any plain reading, so it belongs in What's New. Apple prescribes no wording, no apology and no justification — only that it be listed. Note that `What's New in this Version` is **not** in the editable set (Fact 2), so it is fixed at submission.

2.3.1(a) reinforces the same posture from the reviewer side: _"All new features, functionality, and product changes must be described with specificity in the Notes for Review section of App Store Connect (generic descriptions will be rejected)."_ A removal is a product change, so it is safest to name it in the review notes too — and the review notes, unlike What's New, can be edited at any time.

Sources: [App Review Guidelines § 2.3.1, § 2.3.12, § 3.1.2, § 4.2](https://developer.apple.com/app-store/review/guidelines/), [App Store Improvements](https://developer.apple.com/support/app-store-improvements/), checked 2026-09-18.

---

## Summary

| #   | Question                                    | Answer                                                                                                                                                                                                        |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does 2.3.3 reach previews?                  | **No** — previews are 2.3.4. The accuracy duty for both is the § 2.3 lead-in.                                                                                                                                 |
| 1   | Does 2.3.3 reach the review attachment?     | **No.** Nothing in § 2.3 reaches App Review Information, which Apple documents as private and editable at any time.                                                                                           |
| 2   | Are screenshots editable on a live version? | **No.** _"you must create a new version to update the screenshots"_, and removal needs an editable status.                                                                                                    |
| 2   | What is editable on a live version?         | Promotional Text, Copyright, **App Review Information**, Routing App Coverage File, phased-release and availability settings. Not Name, Subtitle, Support/Marketing URL, What's New, screenshots or previews. |
| 3   | Required sets for iPhone+iPad?              | One iPhone set (6.9", or 6.5" instead) and one iPad 13" set.                                                                                                                                                  |
| 3   | Min / max per set?                          | 1 to 10 screenshots; up to 3 previews, previews optional.                                                                                                                                                     |
| 3   | Can a set be shortened 8 → 6?               | Yes, image by image, with no re-upload of the rest — but only while the status is editable, and deletion propagates to "all other locations".                                                                 |
| 3   | Can the iPad set be dropped listing-side?   | **Not documented.** Open question. Apple only says it is required if the app runs on iPad.                                                                                                                    |
| 4   | Is removing a feature a violation?          | **No guideline forbids it.** Only 3.1.2(a) (paid → subscription) and 4.2 (falling below minimum functionality) sit nearby.                                                                                    |
| 4   | Must a removal be in the release notes?     | Yes, under 2.3.12 — a product change must be listed. Apple prescribes no wording.                                                                                                                             |

## Open questions this research could not close

1. How App Store Connect determines that an app "runs on iPad", and whether the iPad screenshot set can be emptied without changing the binary. Not documented in App Store Connect Help.
2. Whether "deleted in all other locations" means other localizations, other scaled device sizes, or both.
3. The accepted file types and size limit for the App Review Information attachment. Absent from App Store Connect Help; the API reference documents the resource but not the constraints.
4. Whether Promotional Text's absence from the "Required, localizable, and editable properties" tables is an omission or intentional — its field description is the only place its editability is stated.
