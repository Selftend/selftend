# Android Closed Testing

Last checked: 2026-05-02

The first Google Play milestone should be closed testing, not production. Do not promote to production until policy, safety, device, and support requirements are reviewed.

The first Android closed-test build uses the maintainer-hosted Supabase project. Self-hosters can build their own native binaries from source with their own public Supabase configuration, but runtime backend switching is intentionally out of scope before Play Store testing.

Official references:

- Play Console account requirements: <https://support.google.com/googleplay/android-developer/answer/13628312>
- Google Play registration: <https://support.google.com/googleplay/android-developer/answer/6112435>
- Play testing tracks: <https://support.google.com/googleplay/android-developer/answer/9845334>
- App testing requirements for new personal accounts: <https://support.google.com/googleplay/android-developer/answer/14151465>
- Google Play Data safety: <https://support.google.com/googleplay/android-developer/answer/10787469>
- Google Play account deletion requirements: <https://support.google.com/googleplay/android-developer/answer/13327111>
- Google Play Health Content and Services: <https://support.google.com/googleplay/android-developer/answer/12261419>
- Health apps declaration: <https://support.google.com/googleplay/android-developer/answer/14738291>
- EAS Android submission: <https://docs.expo.dev/submit/android/>
- EAS build APK/AAB behavior: <https://docs.expo.dev/build-reference/apk/>

## Current app identifiers

- Expo app name: `mental-health`
- Expo slug: `mental-health`
- Native scheme: `mentalhealth`
- Android package: `org.vasilyoshev.mentalhealth`
- iOS bundle identifier: `org.vasilyoshev.mentalhealth`
- Version: `0.1.0`

Choose the final public app name before uploading to Google Play. The package name cannot be changed for the same Play listing after release without creating a new app listing.

## Developer account setup

Use an organization or nonprofit developer account if this project is submitted under an organization. Google currently requires organization accounts to provide organization details such as D-U-N-S number, organization name/address, organization website, organization phone, contact details, developer email, and developer phone. Google displays organization legal name/address and developer contact details on Google Play.

Google currently lists a one-time developer registration fee of `US$25`. Verify the amount and payment requirements during signup.

Current sequencing decision: defer Google Play account creation until after the temporary web version is hosted, the public app name is chosen, and the Android package/name decision is confirmed.

Required owner inputs:

- legal organization or nonprofit name
- D-U-N-S number, if Google requires it for the organization account
- official organization website
- developer display name
- developer email and phone shown on Google Play
- private contact email and phone for Google
- support email for this specific app
- privacy contact email

New personal developer accounts have additional closed-testing requirements before production access. This project should still run a real closed test even if an organization account avoids that specific personal-account gate.

## Google Play health and policy items

Because this is a mental-health/wellness app, treat it as in scope for Google Play health-app review.

Before closed testing:

- complete the Health apps declaration in Play Console
- provide a public privacy policy URL, preferably `https://<domain>/privacy`
- provide a public account deletion URL, preferably `https://<domain>/account-deletion`
- complete the Data safety form for closed testing
- confirm the store listing and app copy include the wellness/self-help boundary
- do not claim diagnosis, treatment, cure, prevention, emergency support, or professional care
- verify reminders are optional, local, and off by default
- verify no ads, analytics SDKs, social feeds, or AI mental-health coach features were added
- resolve all-ages implications before targeting children or marking the app as child-directed

## Build commands

Local verification:

```bash
npm run typecheck
npm test -- --runInBand
```

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

The production profile explicitly builds an Android App Bundle (`.aab`) because Google Play distribution uses AABs. Development and internal-distribution style builds are installable APKs.

Submission command after Play Console and EAS credentials are ready:

```bash
npm run submit:android:production
```

The current EAS submit profile targets the `alpha` track with draft release status. In Google Play Console terms, use this for the first closed-testing workflow only after the app listing, policy forms, testers, and first manual upload requirements are satisfied.

## First Google Play upload sequence

1. Confirm the final public app name and package name.
2. Create the app in Play Console under the organization account.
3. Complete required app content forms:
   - Privacy policy URL
   - Data safety
   - Health apps declaration
   - Target audience and content
   - Ads declaration
   - App access instructions, because testers need an account
4. Add store listing draft copy and screenshots.
5. Build the production AAB with `npm run build:android:production`.
6. Upload the first AAB manually if Google Play API submission is not available yet.
7. Create the closed-testing track and tester list.
8. Submit the closed-testing release for Google review.
9. After the first manual upload and Google service account setup, use EAS Submit for later closed-test builds.

## Closed-test acceptance checklist

Use a real Android device, not only an emulator.

- app installs from Google Play closed testing
- session restores after force close and restart
- Google sign-in returns to the app through `mentalhealth://auth-callback`
- magic-link email returns to the app through `mentalhealth://auth-callback`
- CBT record create/edit/archive works against the intended Supabase project
- reminders are off by default
- enabling reminders asks for permission
- disabling reminders cancels scheduled local notifications
- support page shows a real support email
- privacy policy opens
- terms and boundaries open
- crisis guidance opens
- account deletion page opens and has a real deletion contact

## Draft store listing copy

Final app name pending.

Short description:

```text
Guided self-help and private CBT thought records for calm reflection.
```

Full description:

```text
mental-health is a free, nonprofit-oriented wellness app for guided self-help and reflection.

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
- no push-token storage in the MVP

Security/deletion answers require review:

- data is encrypted in transit
- deletion is request-based until self-service deletion is implemented
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
