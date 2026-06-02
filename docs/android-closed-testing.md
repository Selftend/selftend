# Android Closed Testing

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
- Version: `0.1.0`
- Disabled Android camera/microphone permissions: `android.permission.CAMERA`, `android.permission.RECORD_AUDIO`

The public app name and Android package are now set for the Play listing. The package name cannot be changed for the same Play listing after release without creating a new app listing.

## Developer account setup

Use an organization or nonprofit developer account if this project is submitted under an organization. Google currently requires organization accounts to provide organization details such as D-U-N-S number, organization name/address, organization website, organization phone, contact details, developer email, and developer phone. Google displays organization legal name/address and developer contact details on Google Play.

Google currently lists a one-time developer registration fee of `US$25`. Verify the amount and payment requirements during signup.

Current status: the Google Play developer account and Selftend app record exist, required Play policy forms are completed, and the first production AAB has been uploaded. Next work is service-account setup for repeatable uploads, store-asset polish, and real-device closed-test verification.

Launch audience: Google Play and the app policy text should stay aligned as **18+ / adults only** until under-18 support receives legal and safety review.

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
- Target audience set to 18+ / adults only in Play Console
- app access instructions for account-required testing
- first production AAB upload

Before widening testing:

- confirm the public privacy policy URL is `https://selftend.org/privacy`
- confirm the public account deletion URL is `https://selftend.org/account-deletion`
- confirm the store listing and app copy include the wellness/self-help boundary
- do not claim diagnosis, treatment, cure, prevention, emergency support, or professional care
- verify reminders are optional, local, and off by default
- verify the resolved Android prebuild config does not request camera or microphone/audio permissions
- verify no ads, analytics SDKs, social feeds, or AI mental-health coach features were added
- confirm the Play Console target audience is 18+ and the app is not marked as child-directed

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
npm run submit:android:production
```

The current EAS submit profile targets the `alpha` track with draft release status. In Google Play Console terms, use this for the first closed-testing workflow only after the app listing, policy forms, testers, and first manual upload requirements are satisfied.

The `internal` submit profile targets Google Play internal testing with `releaseStatus: draft`. New Play apps often cannot accept a `completed` release through the API until the required store listing, app-content, policy, and review metadata are complete. The manual GitHub Actions workflow therefore uploads a draft internal-testing release; review and publish it from Play Console when the required metadata is ready.

## Manual GitHub Actions release

`.github/workflows/android-release.yml` defines `Android Play internal release`.

When manually triggered, it:

- checks out `main`
- installs Node `20.19.0`, Java 17, Android API 36, and NDK `27.1.12297006`
- runs `eas build --platform android --profile production --local --non-interactive`
- uploads the generated `.aab` as a GitHub Actions artifact
- uploads the `.aab` as a draft Google Play internal-testing release when `submit_to_play` is enabled

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

`EXPO_PUBLIC_GITHUB_REPO_URL` and `EXPO_PUBLIC_EAS_PROJECT_ID` have app defaults, but setting them as GitHub variables keeps the release environment explicit.

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

Remaining work is tracked in [.github/ROADMAP.md](../.github/ROADMAP.md) under P2: local Android verification including the permission check, store-listing copy and screenshots, the closed-testing track and tester list, release submission for Google review, and Play service account JSON setup so later internal-test builds can ship through the manual GitHub Actions release workflow or EAS Submit.

## Closed-test acceptance checklist

Use a real Android device, not only an emulator.

- app installs from Google Play closed testing
- sign-in screens do not show the Supabase-not-configured message
- session restores after force close and restart
- Google sign-in returns to the app through `selftend://auth-callback`
- magic-link email returns to the app through `selftend://auth-callback`
- CBT record create/edit/archive works against the intended Supabase project
- optional profile-picture upload works without camera or microphone/audio permission prompts
- reminders are off by default
- enabling reminders asks for permission
- disabling reminders cancels scheduled local notifications
- support page shows a real support email
- privacy policy opens
- terms and boundaries open
- crisis guidance opens
- account deletion page opens and has a real deletion contact

## Draft store listing copy

Short description:

```text
Guided self-help and private CBT thought records for calm reflection.
```

Full description:

```text
Selftend is a free, nonprofit-oriented wellness app for guided self-help and reflection.

The first section focuses on private CBT thought records. You can notice a situation, name emotions, identify common thinking patterns, and write a more balanced response.

The app uses an account so your records can sync across web and mobile builds. Reminders are optional and off by default. The project does not include ads, subscriptions, public posting, or AI coaching in the MVP.

Important: this app is not therapy, diagnosis, treatment, crisis support, or emergency support. If you need urgent help, contact local emergency services or a crisis support service available where you are.
```

What to avoid in store copy:

- "therapy app"
- "AI therapist"
- "treats anxiety/depression"
- "emergency support"
- guaranteed outcomes
- pressure-based streak or habit claims

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
- test account instructions for Google or magic-link sign-in
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
