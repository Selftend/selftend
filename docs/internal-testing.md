# Internal Testing

## Current build profiles

`eas.json` includes:

- `development`
- `preview`
- `production`

Use the Android `development` build as the default local runtime. Do not use Expo Go as the normal Android development path.

The Android and iOS `development` profiles use distinct app identities so they can coexist with store/internal-testing apps:

```text
Development name: Selftend Dev
Development Android package: org.vasilyoshev.selftend.dev
Development iOS bundle identifier: org.vasilyoshev.selftend.dev
Development native scheme: selftend-dev
Production Android package: org.vasilyoshev.selftend
Production iOS bundle identifier: org.vasilyoshev.selftend
Production native scheme: selftend
```

For Google Play closed testing, use the `production` profile to create an Android App Bundle. iOS TestFlight/App Store work is deferred out of the current launch path until Apple Developer Program funding or legal organization/nonprofit enrollment is realistic. The `preview` and `production` profiles use matching EAS environments and fail at app-config evaluation if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing.

Manual GitHub Actions workflows are available for maintainer-triggered releases from `main`:

- `Android Play internal release` builds a signed production `.aab` on a GitHub runner and can upload a draft Google Play internal-testing release after Play API credentials are ready.
- `Web production deploy` exports the web app and deploys `dist` to Netlify production.

These workflows are manual by design. CI still validates pushes and pull requests; release workflows should be run only when the current `main` state is intended for testers or production web users.

## Minimum internal verification before widening scope

### Auth

- Google sign-in opens the browser flow
- Google consent returns to `/auth-callback` on web
- Google consent returns to the app in the Android development build
- Expo Go auth checks either return through an allowlisted `exp://**/--/auth-callback` URL or are skipped in favor of the development build
- magic-link email sends successfully from the sign-in screen
- magic-link email opens `/auth-callback` on web
- magic-link email opens the app through `selftend://...` on device builds
- sign out
- session restore after app restart

### CBT

- create minimal valid thought record
- create fuller thought record
- edit saved record
- archive saved record
- review `/cbt/history` list and detail screen

### Tools navigation

- sidebar shows Tools with CBT, Mood tracker, Meditation, ACT, and Gratitude log
- Tools can collapse and expand
- CBT can collapse and expand inside Tools, with History above Learn
- CBT history is nested under CBT, not shown as a top-level navigation item
- Mood tracker opens the working mood flow
- Gratitude log can create, edit, list, open, and delete a private entry
- Meditation and ACT show under-construction placeholder screens only

### Reminders

- reminders are off by default
- enabling reminders asks for permission
- disabling native reminders cancels the scheduled local notification
- disabling web reminders unsubscribes the browser push subscription
- web reminders are tested only after VAPID keys, Edge Function secrets, and the Supabase cron job are configured

### Profile pictures

- Google profile photo renders on the production web origin
- manual profile-picture upload renders on the production web origin
- Remove photo clears a manual upload without falling back to the Google photo
- Use Google photo restores the Google avatar after Remove photo

### Web / mobile smoke

- web build loads
- authenticated flow works
- thought records save and reload
- `/privacy`, `/terms`, `/crisis`, and `/account-deletion` load without sign-in
- `/auth-callback` loads directly and shows the missing-link state

### Future data separation docs smoke

- `docs/self-hosting.md` explains hosted Supabase now, then future local-only, custom Supabase, and advanced self-hosted modes
- docs clearly say the Play closed-test build uses the maintainer backend
- docs clearly say local-only mode, Drive sync, and runtime backend switching are deferred

### Public support and policy

- support screen has a real support contact before external testing
- privacy page has final organization/contact details before external testing
- account deletion page has a real deletion contact before Google Play testing
- crisis guidance is reviewed for the target launch jurisdictions
- sign-in screen links to privacy, terms, and crisis guidance

## Recommended commands

```bash
npm run typecheck
npm test -- --runInBand
npm run export:web
npm run serve:web:production
npm run start
npm run start:prod
npm run start:emulator
npm run start:prod:emulator
npm run build:android:development
npm run build:android:preview
npm run build:android:production
EAS_LOCAL_BUILD_ARTIFACTS_DIR=./build-artifacts npm exec eas-cli -- build --platform android --profile production --local --non-interactive
```

Use Node `20.19.0+` so your local runtime matches the current `package.json` engine requirement before you install or test anything.

## Android development build

Use the development build instead of Expo Go for normal Android development, reminder behavior, and device verification.

1. Confirm `.env` has real Supabase values.
2. The linked Expo project ID is already configured in `app.config.ts`. Only set `EXPO_PUBLIC_EAS_PROJECT_ID` if you need to override it.
3. In Supabase Auth redirect URLs, add `selftend-dev://auth-callback`.
4. Run `npm exec eas-cli -- init` once if the EAS project has not been linked yet.
5. Run `npm run build:android:development`.
6. Install the generated `Selftend Dev` build on the target device.
7. Run `npm run start` for a real device or `npm run start:emulator` for the Android Studio emulator. Use the `:prod` variants when testing against the hosted Supabase project.
8. Open `Selftend Dev` and verify auth, persistence, and reminder scheduling there.

`npm run start` starts Metro for the development client and configures `adb reverse` for connected Android devices before Expo starts. `npm run start:emulator` launches the configured Android Studio emulator, starts the Expo development-client server, configures `adb reverse` for Metro and local Supabase, then opens `Selftend Dev` with the `selftend-dev://expo-development-client/?url=...` URL. `npm run start:prod` and `npm run start:prod:emulator` use `.env` for hosted Supabase values. The emulator command intentionally avoids Expo CLI's `--android` opener because that can fall back to Expo Go when the development client is missing or stale. If the Play app opens instead, the installed development client is stale or still uses the production scheme; rebuild the development client from the current config and install the new `org.vasilyoshev.selftend.dev` package. The Play app can stay installed.

## Play build environment check

Before publishing a preview or production build to testers:

1. Confirm the matching EAS environment has:
   ```text
   EXPO_PUBLIC_SUPABASE_URL
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   EXPO_PUBLIC_PUBLIC_APP_URL
   EXPO_PUBLIC_SUPPORT_EMAIL
   EXPO_PUBLIC_PRIVACY_EMAIL
   EXPO_PUBLIC_SECURITY_EMAIL
   ```
2. Rebuild the AAB after changing any of those values. Existing Play builds keep the environment values that were baked in at build time.
3. Install from Play internal testing and confirm the sign-in screen does not show the Supabase-not-configured message.

## iOS TestFlight note

iOS TestFlight and App Store work is deferred. Do not spend on Apple Developer Program enrollment or submit an iOS build until one of these is true:

- the annual Apple Developer Program fee is funded and the maintainer accepts the seller-name tradeoff, or
- Selftend has a legal organization/nonprofit identity that can enroll under the organization name and, if eligible, apply for Apple's fee waiver.

Release scripts and EAS submit config for iOS are intentionally omitted while this is deferred. Reintroduce them only when the Apple path is funded and ready.

## Store-readiness note

Do not widen closed testing or move to store production yet. Finish:

- production public route smoke testing
- CSP verification against the real Expo web build
- self-service deletion testing against production Supabase
- privacy policy and terms legal review
- crisis/safety copy jurisdiction review
- app store screenshots, policy-safe copy, FAQ, and public support guidance
- Google Play service account JSON after the first manual upload
- internal device testing
- icon/screenshot/store copy polish

Web push VAPID keys, Edge Function secrets, cron scheduling, and cross-browser web-push verification are deferred reminder infrastructure. They do not block the first public web test.

See [deployment.md](deployment.md), [self-hosting.md](self-hosting.md), [android-closed-testing.md](android-closed-testing.md), and [policies.md](policies.md) for launch-specific checklists.
