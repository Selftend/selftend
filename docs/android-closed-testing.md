# Android Closed Testing

> **Status: this milestone is done.** Google Play **production access was approved on 2026-07-27** and v0.6.1 shipped to the production track. The release pipeline now releases to **production** automatically and mirrors the same build onto the closed tracks — see [Branching And Releases](./releasing.md#how-android-reaches-users). This doc is kept for the closed-testing track setup, tester management, and account/policy reference it still documents accurately.
>
> **How the closed tracks are fed (#374):** every production release mirrors onto `Groups` + `alpha` (the floor — testers are never behind users), and dispatching the `Android Play closed-testing release (dev)` workflow builds `dev` onto `Groups`/`alpha` to put testers ahead between releases — see [How testers stay ahead](./releasing.md#how-testers-stay-ahead-closed-tracks), including its unpromoted-migrations precondition.

The first Google Play milestone should be closed testing, not production. Do not promote to production until policy, safety, device, and support requirements are reviewed.

The first Android closed-test build uses the maintainer-hosted Supabase project. Local-only mode, Google Drive sync, and custom-backend runtime switching are future privacy features, not blockers for closed testing.

Official references:

- Play Console account requirements: <https://support.google.com/googleplay/android-developer/answer/13628312>
- Google Play registration: <https://support.google.com/googleplay/android-developer/answer/6112435>
- Play testing tracks: <https://support.google.com/googleplay/android-developer/answer/9845334>
- App testing requirements for new personal accounts: <https://support.google.com/googleplay/android-developer/answer/14151465>
- Google Play target API requirements: <https://support.google.com/googleplay/android-developer/answer/11926878>
- Google Play Data safety: <https://support.google.com/googleplay/android-developer/answer/10787469>
- Google Play account deletion requirements: <https://support.google.com/googleplay/android-developer/answer/13327111>
- Google Play Health Content and Services: <https://support.google.com/googleplay/android-developer/answer/16679511>
- Health apps declaration: <https://support.google.com/googleplay/android-developer/answer/14738291>
- Expo app config `android.blockedPermissions`: <https://docs.expo.dev/versions/latest/config/app/#blockedpermissions>
- Expo ImagePicker config plugin: <https://docs.expo.dev/versions/latest/sdk/imagepicker/>
- EAS local builds: <https://docs.expo.dev/build-reference/local-builds/>
- EAS app version management: <https://docs.expo.dev/build-reference/app-versions>
- EAS environment variables: <https://docs.expo.dev/eas/environment-variables>
- EAS Android submission: <https://docs.expo.dev/submit/android/>
- EAS build APK/AAB behavior: <https://docs.expo.dev/build-reference/apk/>

## Current app identifiers

- Expo app name: `Selftend`
- Expo slug: `selftend`
- Native scheme: `selftend`
- Android package: `org.vasilyoshev.selftend`
- iOS bundle identifier: `org.vasilyoshev.selftend`
- Version: see `version` in `package.json` (release-please bumps it each release; it drives the Android `versionName`)
- Disabled Android camera/microphone permissions: `android.permission.CAMERA`, `android.permission.RECORD_AUDIO`

The public app name and Android package are now set for the Play listing. The package name cannot be changed for the same Play listing after release without creating a new app listing.

## Developer account setup

Use an organization or nonprofit developer account if this project is submitted under an organization. Google currently requires organization accounts to provide organization details such as D-U-N-S number, organization name/address, organization website, organization phone, contact details, developer email, and developer phone. Google displays organization legal name/address and developer contact details on Google Play.

Google currently lists a one-time developer registration fee of `US$25`. Verify the amount and payment requirements during signup.

Current status: the Google Play developer account and Selftend app record exist, required Play policy forms are completed, and the first production AAB has been uploaded. Next work is service-account setup for repeatable uploads, store-asset polish, and real-device closed-test verification.

Launch audience: the app policy text moved to a **per-country floor of 13 or higher** on 2026-09-04 ([#1767](https://github.com/Selftend/selftend/issues/1767), [age-floor.md](age-floor.md)). Play Console declared **18 and over** until **2026-09-24**, when the rollout pass ([#1771](https://github.com/Selftend/selftend/issues/1771)) added the 13-15 and 16-17 groups and sent them for review as submission 120. The text itself shipped earlier, in v0.18.0 on 2026-09-09. What Play said during that change is in [§ Teen audience change, 2026-09-24](#teen-audience-change-2026-09-24).

Required owner inputs:

- legal organization or nonprofit name
- D-U-N-S number, if Google requires it for the organization account
- official organization website
- developer display name
- developer email and phone shown on Google Play
- private contact email and phone for Google
- support email for this specific app
- privacy contact email

The build machine must also be authenticated with Expo before EAS builds or submissions can run. Verify locally with `npm exec eas-cli -- whoami`; if it fails, run `npm exec eas-cli -- login` locally. For GitHub Actions, set an `EXPO_TOKEN` repository secret.

New personal developer accounts have additional closed-testing requirements before production access. This project should still run a real closed test even if an organization account avoids that specific personal-account gate.

## Google Play health and policy items

Because this is a mental-health/wellness app, treat it as in scope for Google Play health-app review.

Completed for the current Play app:

- Health apps declaration in Play Console
- Data safety form for closed testing
- Target audience declared in Play Console (13-15, 16-17, 18 and over, sent for review 2026-09-24 on [#1771](https://github.com/Selftend/selftend/issues/1771); 18 and over only before that)
- app access instructions for account-required testing
- first production AAB upload

Before widening testing:

- confirm the public privacy policy URL is `https://selftend.org/privacy`
- confirm the public account deletion URL is `https://selftend.org/account-deletion`
- confirm the store listing and app copy include the wellness/self-help boundary
- do not claim diagnosis, treatment, cure, prevention, emergency support, or professional care
- verify reminders are optional, local, and off by default
- verify the resolved Android prebuild config does not request camera or microphone/audio permissions
- verify no ads, social feeds, or AI mental-health coach features were added (note: the Sentry SDK is present as an approved Phase 2 exception per `docs/analytics.md`; it is classified essential/Art. 6(1)(f) and disabled without `EXPO_PUBLIC_SENTRY_DSN`)
- confirm the Play Console target audience matches the published floor and the app is not marked as child-directed (both halves moved together on [#1771](https://github.com/Selftend/selftend/issues/1771), 2026-09-24; a mismatch in either direction is a policy problem)

## Teen audience change, 2026-09-24

Recorded during the Console sitting itself, because nothing in Play keeps a record of what a form said while you filled it in ([#2691](https://github.com/Selftend/selftend/issues/2691)). The three changes went as one submission, **120**, sent **2026-09-24 17:31** and `Published` the same day. The listing-text detail is in [store/play-listing.md](../store/play-listing.md).

### Target audience and content

- **Before:** only _18 and over_ ticked; the sub-option _"Restrict users that Google has determined to be minors from my app (optional)"_ unticked.
- Ticking **13-15** next to 18 and over showed a red inline error, _"Choose consecutive age groups"_, until **16-17** was ticked too. The restrict-minors sub-option **disappears** as soon as any under-18 group is ticked.
- With 13-15, 16-17 and 18 and over ticked, a **Policy requirements summary** appeared under the checkboxes, verbatim:

  > Depending on the countries where your app is available, some or all of the users in your target audience may be considered children. You must comply with the Families policy whenever your app is being used by a child.
  >
  > This includes:
  >
  > - Making sure that any content in your app that could be seen by children is appropriate for them
  > - Only displaying ads that are appropriate for children, whenever your app is being used by a child
  > - Only displaying ads that are from Google Play certified ad networks , or ads served by you, whenever your app is being used by a child. This includes ads for your own apps, or from partnerships with other brands
  > - Making sure that your app (including all APIs, SDKs and ads) complies with all applicable laws and regulations relating to children, such as the US Children's Online Privacy Protection Act COPPA, and the EU General Data Protection Regulation GDPR
  >
  > You can either make your entire app compliant, or implement a neutral age screen and comply with the policy when the user is a child.

- ⭐ **No newly required field, no interstitial, and no forced declaration.** _Next_ went straight from step 1 (Target age) to step 5 (Summary), and steps 2 _App details_, 3 _Ads_ and 4 _Store presence_ were never asked. The summary read _"The target age group for your app is: 13-15, 16-17, 18 and over"_. After _Save_, **App content → Need attention stayed empty**: no Families declaration and no ads declaration. The Publishing overview described the change as _"Update Target audience and content information. Target age is 13 and older."_
- **Store-listing review:** the audience change did not force one on its own. The listing went for review anyway, because the description edit rode in the same submission.
- ⚠️ The Families-policy text above applies whenever the app "is being used by a child". Selftend's neutral age screen admits nobody under the per-country floor ([age-floor.md](age-floor.md)), and the app has no ads or ad SDKs, so the ads clauses have nothing to apply to. The content and legal clauses are what the §5 review (completed 2026-09-24 with no Tier-1 findings; its record is PR [#2745](https://github.com/Selftend/selftend/pull/2745)) covered.

### Content rating (IARC re-take)

- **Before:** certificate `0090706e-7b48-86a6-8280-3f6bf70c423c`, submitted 2026-05-07, category _All other app types_: ClassInd All ages, ESRB Everyone, PEGI 3, USK All ages, IARC Generic 3+, Google Play Russia 3+, South Korea 3+, no content descriptors.
- _Start new questionnaire_ asks again for the contact email, the category and a fresh tick of _"I agree to the Terms of Use as outlined by the International Age Rating Coalition (IARC)"_ (approved by the owner at the sitting).
- The _All other app types_ questionnaire has **sixteen questions** in five groups: _Downloaded app_ (a gate question, then violence/blood, scary content, sexuality, gambling, offensive language, drugs/alcohol/tobacco, crude humour), _User content sharing_, _Online content_, _Promotion or sale of age-restricted products or activities_, and _Miscellaneous_ (precise location sharing, digital purchases, cash rewards/NFTs, browser or search engine, news or educational).
- ☠️ **There is no self-harm or suicide question.** The whole questionnaire's text was searched and none exists, so #1771's "read the live self-harm/suicide question text" had no text to read. There is no separate social-media question either. The closest is _"Does the app natively allow users to interact or exchange content with other users through voice communication, text or sharing images or audio?"_, answered **No**.
- ⚠️ **One owner ruling.** _"Does the app contain any reference to or use of drugs, alcohol or tobacco?"_: the app's copy mentions alcohol, drugs and nicotine only as health information (DBT's PLEASE "Substances" line, the sleep diary's notes hint, ACT's "urge to drink" example). _Yes_ opens _"Please select all that the app includes: Illegal or recreational drugs / Fantasy drugs / Medical drugs / Alcohol / Tobacco"_. It was **answered No by owner decision**, the same position the May certificate took before DBT existed.
- All sixteen were answered **No**. **The result did not change**: ClassInd All ages, ESRB Everyone, PEGI 3, USK All ages, IARC Generic 3+, Russia 3+, South Korea 3+, no descriptors. Saved 2026-09-24 17:29. The new certificate ID shows `-` until the review completes.

### Data safety

Not edited. On 2026-09-24 the public page lists **Health info · Optional** (App functionality, Personalization) and **Other user-generated content · Optional** (same purposes) among the collected types, plus _No data shared with third parties_. So journal entries are declared under both. Nothing in the audience change asked for data safety to be re-confirmed.

### Age Suitability URL and the "new social media questions"

Neither exists anywhere in Play Console (checked Store settings, Content ratings and App content). Both belong to the age-rating form in **App Store Connect**, not Play.

## Build commands

Local verification:

```bash
npm exec expo -- config --type prebuild --json
npm run typecheck
npm test -- --runInBand
```

Before the first Play upload, confirm the prebuild config does not list `android.permission.CAMERA` or `android.permission.RECORD_AUDIO` in `android.permissions`. The app only uses the photo library for optional profile-picture changes; `app.config.ts` sets `cameraPermission: false` and `microphonePermission: false` on `expo-image-picker` so those permissions are not requested and are guarded against Android manifest merging.

Internal installable Android build:

```bash
npm run build:android:development
```

Preview installable Android build:

```bash
npm run build:android:preview
```

Production Google Play App Bundle:

```bash
npm run build:android:production
```

Production Google Play App Bundle on the current machine, without waiting in the EAS cloud queue:

```bash
mkdir -p build-artifacts
EAS_LOCAL_BUILD_ARTIFACTS_DIR=./build-artifacts npm exec eas-cli -- build --platform android --profile production --local --non-interactive
```

The production profile explicitly builds an Android App Bundle (`.aab`) because Google Play distribution uses AABs. Development and internal-distribution style builds are installable APKs.

This repo now uses EAS remote app-version management with `build.production.autoIncrement: true`. After the first Play upload and remote version initialization, production builds automatically increment the Android `versionCode`. Keep `version` in `app.config.ts` as the human-facing release version and use EAS remote versioning for the developer-facing Play upload number.

The `preview` and `production` EAS profiles explicitly select the matching EAS environment. Before building a Play-bound AAB, set these public values in the EAS `production` environment:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_PUBLIC_APP_URL
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_PRIVACY_EMAIL
EXPO_PUBLIC_SECURITY_EMAIL
```

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required at build time. The app config now fails `preview` and `production` EAS builds when either value is missing, because those values are baked into the JavaScript bundle and cannot be fixed inside an already uploaded Play build.

Submission command after Play Console and EAS credentials are ready:

```bash
npm run submit:android:closed
```

The `closed` EAS submit profile targets the `alpha` track (Google Play's default **Closed testing** track) with `releaseStatus: completed`, so an accepted upload is sent for Google review and then released to the closed testers automatically. Use it only after the app listing, policy forms, the closed-testing track, its tester list, and the first manual upload requirements are satisfied.

Closed-testing releases go through Google review before testers can install, unlike the internal track. If a `completed` release is rejected by the Play API because required store listing, app-content, policy, or review metadata is still incomplete, temporarily set the profile to `releaseStatus: draft` and publish from Play Console instead. The `internal` submit profile (`track: internal`, `releaseStatus: completed`) remains available for quick internal-track drops.

## Manual GitHub Actions release

`.github/workflows/android-release.yml` defines `Android Play production release`.

When manually triggered, it:

- checks out `main`
- installs Node `22.23.1`, Java 17, Android API 36, and NDK `27.1.12297006`
- runs `eas build --platform android --profile production --local --non-interactive`
- uploads the generated `.aab` as a GitHub Actions artifact
- releases the `.aab` to the Google Play **production** track as `completed` when `submit_to_play` is enabled — live to all users once Google's review clears, with no staged rollout and nothing to press
- mirrors that same versionCode onto the `Groups` and `alpha` closed testing tracks, so testers are never behind production

Required GitHub repository variables:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_GITHUB_REPO_URL
EXPO_PUBLIC_PUBLIC_APP_URL
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_PRIVACY_EMAIL
EXPO_PUBLIC_SECURITY_EMAIL
```

Optional GitHub repository variables:

```text
EXPO_PUBLIC_DISCORD_URL
```

`EXPO_PUBLIC_GITHUB_REPO_URL` and `EXPO_PUBLIC_EAS_PROJECT_ID` have app defaults, but setting them as GitHub variables keeps the release environment explicit. `EXPO_PUBLIC_DISCORD_URL` defaults to the maintainer's Discord invite; set it to an empty string to hide all Discord UI.

The GitHub workflow passes repository variables into the local EAS build. Direct EAS cloud builds use the variables stored in the selected EAS environment instead. Keep both sources in sync before publishing a tester build.

Required GitHub repository secrets:

```text
EXPO_TOKEN
```

Required only when `submit_to_play` is enabled:

```text
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

The first manual upload requirement is now satisfied. Do not set `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` until the Play service account has been created with access to the app.

## First Google Play upload status

The app exists in Play Console under the confirmed public app name and package name, with the required content forms completed (privacy policy URL, data safety, health apps declaration, target audience and content, ads declaration, app access instructions for the account-required tester flow). The first production AAB was built with `npm run build:android:production` and uploaded manually.

That list of remaining work — store-listing copy and screenshots, the closed-testing track and tester list, release submission for Google review, and Play service account JSON setup — is now complete. The app is live on [Google Play](https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend), and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is wired into [android-release.yml](../.github/workflows/android-release.yml), so builds ship through the release workflow. Anything still outstanding is tracked in [GitHub Issues](https://github.com/Selftend/selftend/issues), not in the repo.

## Closed-test acceptance checklist

Use a real Android device, not only an emulator.

- app installs from Google Play closed testing
- sign-in screens do not show the Supabase-not-configured message
- session restores after force close and restart
- Google sign-in returns to the app through `selftend://auth-callback`
- CBT record create/edit/archive works against the intended Supabase project
- optional profile-picture upload works without camera or microphone/audio permission prompts
- reminders are off by default
- enabling reminders asks for permission
- disabling a reminder turns it off and it stays off after a restart (delivery is server-side; there is no device-side schedule to cancel)
- support page shows a real support email
- privacy policy opens
- terms and boundaries open
- crisis guidance opens
- account deletion page opens and has a real deletion contact

## Store listing copy

The listing text is owner-edited in Play Console and mirrored, verbatim and dated, in [store/play-listing.md](../store/play-listing.md); the words it may and may not use are in [docs/positioning.md](positioning.md). The draft that used to sit here predates both and was retired on 2026-09-02 so the copy lives in one place.

## Initial Data safety inputs

These are implementation notes, not a substitute for completing Play Console carefully.

Likely collected data:

- email address and account identifiers for authentication
- private app content users enter, currently CBT thought records
- optional profile picture image and avatar metadata, if the user chooses a custom profile picture
- app preferences and reminder settings
- authentication/session metadata handled by Supabase

Likely purposes:

- app functionality
- account management
- user-requested data sync

Current no/none answers to verify:

- no ads
- no sale of user data
- no analytics SDK
- no third-party behavioral tracking SDK
- no public social sharing
- no camera-capture or microphone/audio recording feature or permission
- no push-token storage in the MVP

Security/deletion answers require review:

- data is encrypted in transit
- self-service account deletion is implemented in Settings, with email request as a fallback
- public deletion URL should be `https://<domain>/account-deletion`

## Tester instructions

Send testers:

- closed-testing opt-in link from Play Console
- support email for feedback
- warning not to enter urgent crisis details into feedback channels
- test account instructions for Google sign-in
- expected checks:
  - sign in
  - create one short CBT record
  - edit it
  - archive it
  - optionally change then remove a profile picture
  - restart the app and verify session restore
  - enable then disable a reminder
  - open privacy, terms, crisis, and account deletion pages

Tester feedback should ask for:

- install problems
- sign-in redirect problems
- broken persistence
- confusing copy
- accessibility problems
- any copy that feels like diagnosis, therapy, emergency support, shame, or pressure

Do not ask testers to share private mental-health details.
