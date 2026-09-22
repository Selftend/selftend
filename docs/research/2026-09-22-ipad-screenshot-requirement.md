# What Apple requires of an iPad-capable build that ships no iPad screenshots

Research for [What Apple actually requires of an iPad-capable build that ships no iPad screenshots](https://github.com/Selftend/selftend/issues/2654), under map [#2652](https://github.com/Selftend/selftend/issues/2652). Successor to [#2597](https://github.com/Selftend/selftend/issues/2597), which raised all three questions and could answer none of them.

**Everything below checked 2026-09-22**, from public sources only. **No Apple credentials were used and App Store Connect was not signed into** — nothing here is an observation of the console.

Apple primary sources first (App Store Connect Help, App Review Guidelines, Apple Developer documentation and archived Technical Q&A). Developer-forum posts appear **only as corroboration of behaviour Apple documents or fails to document**, never as the sole basis for a claim, and are labelled as such.

This document **does not choose a route** and proposes no change to the app.

## Headline

Two of the three questions are now answered, and the answer to the third is the one that matters most — and it goes the opposite way from the direction the map was leaning.

1. **"Runs on iPad" is decided by the binary**, specifically `UIDeviceFamily` in `Info.plist`, which Xcode writes from the `TARGETED_DEVICE_FAMILY` build setting, which Expo writes from `ios.supportsTablet`. There is no App Store Connect toggle for it. **Answered.**
2. **What Connect does at submission with an iPad-capable build and an empty iPad set is still undocumented.** Apple states the requirement (_"Required if app runs on iPad"_) and documents no validation behaviour, no error text, and no relationship between the selected build and the required screenshot sets. **Still unknown — and now deliberately so, not for lack of looking.**
3. **Dropping `supportsTablet` is very probably not available to us at all.** Apple's own rule is that an update may not support fewer devices than the version already on the App Store; the upload is rejected at validation. The documented escape hatches are raise the deployment target, or ship under a **new bundle ID as a separate app**. **Answered, with a dating caveat.**

The practical consequence: **#2597's framing had it backwards.** It recorded _"the documented route to no iPad set is to stop running on iPad."_ That route is the one Apple documents as closed. The undocumented route — empty the set on a still-iPad-capable build — is the only one that is even arguably open, and nobody can say from public sources whether Connect permits it.

---

## Finding 1 — "Runs on iPad" is a property of the binary, not of the listing

### The chain, end to end

| Layer           | What sets it                                                                                                                                                                                          | Source                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.config.ts` | `ios.supportsTablet: true` — _"Whether your standalone iOS app supports tablet screen sizes. Defaults to `false`."_                                                                                   | [Expo app config reference](https://docs.expo.dev/versions/latest/config/app/)                                                                                                    |
| Xcode project   | `buildSettings.TARGETED_DEVICE_FAMILY = "1,2"` — Expo's config plugin returns `[1, 2]` for `supportsTablet`, `[2]` for `isTabletOnly`, `[1]` otherwise                                                | [`@expo/config-plugins` `ios/DeviceFamily.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/config-plugins/src/ios/DeviceFamily.ts)                                    |
| `Info.plist`    | `UIDeviceFamily` — _"Specifies the underlying hardware type on which this app is designed to run."_ `1` = _"The app runs on iPhone and iPod touch devices."_, `2` = _"The app runs on iPad devices."_ | [Information Property List Key Reference, iOS Keys](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/iPhoneOSKeys.html) |

Apple is explicit that the plist key is derived, not authored:

> Do not insert this key manually into your `Info.plist` files. Xcode inserts it automatically based on the value in the Targeted Device Family build setting. You should use that build setting to change the value of the key.

— [iOS Keys, `UIDeviceFamily`](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/iPhoneOSKeys.html), checked 2026-09-22

⚠️ That page sits in Apple's **Documentation Archive** and carries the banner _"This document is no longer being updated."_ The modern Information Property List reference has **no `UIDeviceFamily` page at all** — `developer.apple.com/documentation/bundleresources/information-property-list/uidevicefamily` returns 404 (checked 2026-09-22). So the only Apple prose defining the key is archived. The mechanism is nonetheless still live: Xcode's current [Supported Destinations](https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target) UI is the same build setting under a newer name, and Apple's current submission page still tells developers to _"Verify that your information property list (info.plist) is compatible with any device requirements when submitting a new app"_ ([Submitting — App Store](https://developer.apple.com/ios/submit/)).

### There is no Connect setting

Searched App Store Connect Help end to end. **No page exposes a device-family or "runs on iPad" control.** The closest Connect gets is the screenshot UI itself:

> For the iOS version of your app, select the iPhone or iPad tab.

— [Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/), checked 2026-09-22

Both tabs are described unconditionally. Apple never says the iPad tab appears, disappears, or becomes required as a function of the build.

The App Store Connect API agrees. `BuildBundle` — the resource that describes a specific binary — exposes no device-family attribute ([BuildBundle](https://developer.apple.com/documentation/appstoreconnectapi/buildbundle), checked 2026-09-22). Device family is not modelled anywhere in Connect's own data; it exists only inside the binary.

### The sting in the tail: dropping iPad does not stop iPad users

This is the part that makes question 3 expensive, so it belongs here.

**App Review Guideline 2.4.1**, verbatim:

> To ensure people get the most out of your app, iPhone apps should run on iPad whenever possible. We encourage you to consider building apps so customers can use them on [all of their devices](https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target).

— [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), checked 2026-09-22

An iPhone-only binary still installs on iPad, in iPhone compatibility mode, and the App Store still offers it there. That is Apple's stated design, not a bug.

**Corroboration (forum, Apple staff):** an Apple engineer answering a developer whose iPhone-only app was still downloadable on iPad wrote that this follows from _"the App Store Review Guidelines and iPhone applications running in compatibility mode"_, and said the only way to genuinely block iPad installation is to declare an iPhone-exclusive `UIRequiredDeviceCapabilities` entry — while warning that even that carries no future guarantee ([thread 707053](https://developer.apple.com/forums/thread/707053), Jun 2022).

**Corroboration (forum, App Review correspondence quoted by a developer):** a developer who removed iPad from Supported Destinations was nonetheless reviewed on an iPad Air (5th gen) and rejected under 2.1, with App Review writing:

> Regarding 2.1, as we mentioned in our previous correspondence, users expect apps they download to function on all the devices where they are available. Since your app may be downloaded onto iPad devices, it is important that it also function as expected for iPad users.

— [thread 781735](https://developer.apple.com/forums/thread/781735), Apr 2025. An App Review staff account replied in-thread saying they were investigating; **no resolution was ever posted.**

⚠️ **Treat that quote as one developer's report of a rejection letter, not as Apple policy text.** It is not a guideline and Apple has not published it. It is recorded here because it is the only evidence in either direction on whether dropping the device family changes what App Review tests on, and it points at _no_.

---

## Finding 2 — the submission-time behaviour is still undocumented. This is the honest gap.

### What Apple actually says

The entire published requirement is one table cell:

| Display Size | Portrait                         | Requirement                      |
| ------------ | -------------------------------- | -------------------------------- |
| iPad **13"** | 2064 x 2752 px<br>2048 x 2732 px | **Required if app runs on iPad** |

— [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), checked 2026-09-22. Every other iPad row (12.9", 11", 10.5", 9.7") carries only _"If screenshots with the accepted sizes aren't provided, scaled screenshots for 13" displays are used."_ 2064x2752 is confirmed as the current 13" portrait size — the one the live listing already uses.

Counts, same page: _"You can upload one to 10 screenshots in `.jpeg`, `.jpg`, and `.png` formats. Images can't include alpha channels or transparencies."_

That is **all** Apple publishes. Specifically, Apple does **not** document:

- how Connect evaluates "runs on iPad" — whether from the build attached to the version, from any build ever uploaded, or from the app record;
- what happens at submission if an iPad-capable version has zero iPad screenshots;
- any error text, validation message, or blocking behaviour;
- whether the iPad tab is hidden, shown-but-optional, or shown-and-required for a given build.

### Removal is documented as an operation, and it is gated

> You can remove screenshots and app previews **only when the app status is editable**.

> Once the screenshot or app preview is deleted, it'll also be deleted in all other locations.

— [Remove app previews or screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/remove-app-previews-or-screenshots/), checked 2026-09-22

And, from the upload page: _"Once your app is submitted for review and approved, you must create a new version to update the screenshots."_ ([Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/)). Screenshots remain absent from the Editable column of [Required, localizable, and editable properties](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/) — re-verified today, unchanged from #2597's reading.

So: **removal is per-image, from an editable-status version, and Apple documents no floor.** The help text never says "you may not delete the last one".

The App Store Connect API goes further and models an entire set as a deletable resource. [App Screenshot Sets](https://developer.apple.com/documentation/appstoreconnectapi/app-screenshot-sets) — abstract _"Create sets of app screenshots to upload to App Store Connect"_ — documents `POST /v1/appScreenshotSets`, `GET /v1/appScreenshotSets/{id}` and **`DELETE /v1/appScreenshotSets/{id}`**, with `screenshotDisplayType` selecting the size. The iPad display types are `APP_IPAD_PRO_3GEN_129`, `APP_IPAD_PRO_3GEN_11`, `APP_IPAD_PRO_129`, `APP_IPAD_105`, `APP_IPAD_97` (checked 2026-09-22).

⚠️ Two cautions on that. First, **the API's data model permitting a DELETE is not evidence that submission validation permits the resulting state.** The same API lets you delete the iPhone set, which is certainly required. Second, **there is no `13"` display type.** Developers report the website maps 13" uploads onto `APP_IPAD_PRO_3GEN_129` ([thread 751867](https://developer.apple.com/forums/thread/751867), May 2024, with a Feb 2025 follow-up calling it an _"extreme blocker"_ for programmatic upload). No Apple staff reply. That mismatch is worth knowing before anyone plans an API-driven route.

### What the forums show — and why it does not settle it

| Report                                                     | Date         | What it shows                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [677799](https://developer.apple.com/forums/thread/677799) | Apr 2021     | `TARGETED_DEVICE_FAMILY = 1` (iPhone only), yet Connect still displayed iPad screenshot fields. Developer submitted anyway: _"Got through review with no issues. I'm guessing the interface just doesn't hide the iPad screenshots as of now."_ |
| [92208](https://developer.apple.com/forums/thread/92208)   | Nov–Dec 2017 | Developer believed Connect was demanding cross-family screenshots; root cause was that _"someone has changed the iphone or ipad only app to an universal app"_ — i.e. the demand tracked the **binary's** device family.                        |
| [707971](https://developer.apple.com/forums/thread/707971) | Jun 2022     | "Pure iPhone app" told more screenshots were needed; turned out to be an upload stuck in _pending_, not a real iPad requirement. Apple staff replied only with links to the two help pages quoted above.                                        |
| [716381](https://developer.apple.com/forums/thread/716381) | Sep 2022     | Community answer listing then-required sets; a respondent notes Media Manager itself marks which sizes are required vs optional for a given app. No Apple statement.                                                                            |

Read together these are **suggestive of the requirement tracking the binary's device family, and of an iPhone-only app being able to submit with the iPad set empty**. Not one of them is the case we actually care about: **an iPad-capable binary submitted with an empty iPad set.** No public report of that case was found.

### ⚠️ Verdict: genuinely unanswerable from public sources

Apple publishes the requirement and nothing else. No help page, guideline, API reference or developer-news item describes the validation. This is the same wall #2597 hit, and it is confirmed rather than moved.

**What evidence would settle it, and who can get it:**

- **The owner, in App Store Connect, without submitting anything.** Create the next version (status _Prepare for Submission_, therefore editable), attach the iPad-capable build, delete the eight iPad screenshots, and press **Add for Review**. Connect validates client-side before anything reaches Apple, so the answer arrives as either a red field-level error naming the missing iPad set, or a clean transition to _Waiting for Review_. **Screenshot whatever appears, including the exact error string** — that string is the artefact no public source contains. This is reversible: the images can be re-uploaded while the version is still editable, and the version need not be submitted.
- **Second-best, no console needed:** the App Store Connect API's `POST /v1/appStoreVersionSubmissions` returns structured errors. Its error bodies for missing required metadata are not documented, so this still has to be _observed_, and it needs an API key — i.e. still the owner.
- **Not obtainable by an agent.** Both routes require authenticated access to the account, which this ticket's rules correctly forbid.

---

## Finding 3 — removing `supportsTablet` is, by Apple's own rule, not available to a shipped app

### The rule

Apple's Technical Q&A **QA1623**, _"Why am I getting device support errors when uploading my app?"_:

> iTunes Connect does not allow uploading an updated version of an app when the update runs on fewer devices than the version of the app currently in the App Store. **This is by design.**
>
> An update to an app must work for every customer who has already purchased the app, and is running a current version of iOS.

The error raised when the device family specifically is narrowed:

> This bundle does not support one or more of the devices that were supported in the previous bundle for this app. Bundles must continue to support any devices previously supported.

> This occurs when you have changed the "Targeted Device Family" build setting (which modifies the `UIDeviceFamily` info.plist key).

Apple lists exactly three ways out:

1. _"Fix their app so that it can work on the devices they originally set out to support."_
2. _"Target a newer version of iOS that requires a newer device."_ — drops only devices that cannot run the new minimum. **Useless here: every iPad in the 13" class runs current iPadOS.**
3. _"Remove their app from the store, and upload the new app with a different bundle ID."_ — and Apple's own warnings on that option: _"the update will be listed on the store as a separate app"_, _"Existing users of your app must purchase the update through the App Store, just like new customers"_, _"it must have a different name in iTunes Connect than the name of the app already in the store"_, and _"If you delete an app from the store, then you cannot use its name again for another app."_

— [Technical Q&A QA1623](https://developer.apple.com/library/archive/qa/qa1623/_index.html), document ID QA1623, last updated **2012-09-18**, checked 2026-09-22

### ⚠️ The dating caveat, stated plainly

QA1623 is **fourteen years old** and carries the archive banner _"This document is no longer being updated."_ It still says _iTunes Connect_. **No current Apple page restates the rule** — it is absent from [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/), from [Submitting](https://developer.apple.com/ios/submit/), and from the App Review Guidelines. So the claim "this rule is still enforced in 2026" rests on corroboration, not on a current Apple page.

**The corroboration is strong and recent.** The validation failure is reported continuously, by developers describing the live error, in a thread an Apple App Review account participated in:

| Report                                                                                | Date     | Quote                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [778418](https://developer.apple.com/forums/thread/778418) — App Review staff account | Apr 2025 | _"Thank you for your post. We've begun investigating this issue but we've been unable to locate your app submission…"_ — Apple engaged with the problem and **never published a fix or a workaround.**                             |
| [701706](https://developer.apple.com/forums/thread/701706) — `Arnold75`               | Jun 2025 | _"Upload validation fails saying that I have to support all the devices the previous version supported…"_ — after trying both community workarounds.                                                                               |
| [778418](https://developer.apple.com/forums/thread/778418) — `dang_j`                 | Nov 2025 | _"We're seeing the error about not supporting previously uploaded platforms when we try to disable it."_                                                                                                                           |
| [701706](https://developer.apple.com/forums/thread/701706) — `zenseio`                | Apr 2022 | Hit the error, was pointed at QA1623: _"It is not possible to remove support for existing devices. The only way is to create a new iPhone-only app."_                                                                              |
| [92208](https://developer.apple.com/forums/thread/92208)                              | Dec 2017 | Quotes the modern error code form: `ERROR ITMS-90101: "This bundle does not support one or more of the devices supported by the previous app version. Your app update must continue to support all devices previously supported."` |

Reports span 2017 → Nov 2025 with unbroken continuity and no counter-report of a successful narrowing. Several developers in [701706](https://developer.apple.com/forums/thread/701706) claim removing destinations in Xcode worked for them (`Kopyl`, `ray37`, both Feb 2025) — but read in context those are almost certainly apps whose _shipped_ version was already iPhone-only and whose Xcode project had drifted, which is the [92208](https://developer.apple.com/forums/thread/92208) situation, not ours. `Arnold75` replies directly beneath them that neither method works once the store version genuinely supports iPad.

### The three costs asked about

**Effect on existing iPad installs.** Not reachable, because the removal itself is blocked. If it somehow were permitted, Apple's stated reason for the block is precisely this: _"An update to an app must work for every customer who has already purchased the app."_ The nearest documented mechanism is App Store Connect's **Last-Compatible Version Settings**, under _Pricing and Availability_, which lets a developer choose which previously submitted versions remain available ([Make a version unavailable for download](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/make-a-version-unavailable-for-download/), checked 2026-09-22). ⚠️ That page describes only the control, not the download behaviour; **Apple does not document what an iPad user with the app already installed would see.** Unknown.

**Effect on App Review.** Guideline **2.4.1** says _"iPhone apps should run on iPad whenever possible"_ — a "should", i.e. an encouragement, and no guideline forbids shipping iPhone-only. But Finding 1's evidence says removal does not buy the thing one would remove it for: the app remains downloadable on iPad in compatibility mode, and at least one 2025 rejection letter says App Review holds it to working there regardless.

**Reversibility.** **Widening is always allowed; only narrowing is blocked.** The rule is one-directional by construction — an update may not support _fewer_ devices, so adding iPad back in a later version is the permitted direction and needs no special step. This is an inference from the rule's own wording (_"fewer devices than the version… currently in the App Store"_), not a separate Apple statement. ⚠️ It is also academic if the narrowing can never happen in the first place.

---

## Open questions carried forward

1. **What Connect does at submission with an iPad-capable build and an empty iPad set.** The central question. Unanswerable publicly; settled only by the owner attempting it on an editable version and reading the validation output. See Finding 2 for the exact procedure and why it is safe.
2. **Whether QA1623's rule is still enforced verbatim in 2026.** Evidence is continuous to Nov 2025 and one-directional, but Apple has published nothing current. Would be settled by the owner uploading an iPhone-only build to TestFlight and reading the validation result — the same authenticated-only bar.
3. **What "deleted in all other locations" covers** when a screenshot is removed — other localizations, other scaled sizes, or both. Carried over unresolved from #2597; Apple still does not say.
4. **What an existing iPad user sees** if an update drops their device family. Last-Compatible Version Settings exist; their behaviour is undocumented.
5. **Whether the App Store Connect API's missing 13" display type is intended.** Developers report the website silently maps 13" onto `APP_IPAD_PRO_3GEN_129`; Apple has never confirmed it. Relevant to any API-driven screenshot work.
6. ⚠️ **A possible discrepancy in Apple's own table.** Today's fetch of [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) rendered the iPhone **6.9"** row with the same requirement text as the 6.5" row (_"Required if app runs on iPhone and screenshots for 6.9" display aren't provided"_), which is self-referential and reads as an error. #2597 recorded on 2026-09-18 that the 6.9" row carried **no** requirement cell. Either Apple edited the page or one of the two readings is a rendering artefact. Immaterial to the iPad question, but worth a human eye before anyone quotes the iPhone rows.

## Sources

**Apple primary**

- [App Store Connect Help — Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [App Store Connect Help — Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/)
- [App Store Connect Help — Remove app previews or screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/remove-app-previews-or-screenshots/)
- [App Store Connect Help — Required, localizable, and editable properties](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/)
- [App Store Connect Help — Make a version unavailable for download](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/make-a-version-unavailable-for-download/)
- [App Store Connect Help — Submit for review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-for-review/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (§ 2.4.1, § 2.1(a))
- [Technical Q&A QA1623 — Why am I getting device support errors when uploading my app?](https://developer.apple.com/library/archive/qa/qa1623/_index.html) (archived, 2012-09-18)
- [Information Property List Key Reference — iOS Keys, `UIDeviceFamily`](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/iPhoneOSKeys.html) (archived)
- [App Store Connect API — App Screenshot Sets](https://developer.apple.com/documentation/appstoreconnectapi/app-screenshot-sets) and [`ScreenshotDisplayType`](https://developer.apple.com/documentation/appstoreconnectapi/screenshotdisplaytype)
- [App Store Connect API — BuildBundle](https://developer.apple.com/documentation/appstoreconnectapi/buildbundle)
- [Xcode — Configuring a multiplatform app target (Supported Destinations)](https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target)
- [Submitting — App Store](https://developer.apple.com/ios/submit/)

**Non-Apple primary (toolchain)**

- [Expo — app config reference, `ios.supportsTablet`](https://docs.expo.dev/versions/latest/config/app/)
- [`@expo/config-plugins` — `src/ios/DeviceFamily.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/config-plugins/src/ios/DeviceFamily.ts)

**Corroboration only (Apple Developer Forums — never a sole source above)**

- [707053](https://developer.apple.com/forums/thread/707053) · [781735](https://developer.apple.com/forums/thread/781735) · [778418](https://developer.apple.com/forums/thread/778418) · [701706](https://developer.apple.com/forums/thread/701706) · [677799](https://developer.apple.com/forums/thread/677799) · [707971](https://developer.apple.com/forums/thread/707971) · [716381](https://developer.apple.com/forums/thread/716381) · [92208](https://developer.apple.com/forums/thread/92208) · [751867](https://developer.apple.com/forums/thread/751867)
