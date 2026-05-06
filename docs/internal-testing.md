# Internal Testing

Last updated: 2026-05-05

## Current build profiles

`eas.json` includes:

- `development`
- `preview`
- `production`

Use the Android `development` build as the default local runtime. Do not use Expo Go as the normal Android development path.

For Google Play closed testing, use the `production` profile to create an Android App Bundle after policy forms and store setup are ready.

Manual GitHub Actions workflows are available for maintainer-triggered releases from `main`:

- `Android Play internal release` builds a signed production `.aab` on a GitHub runner and can upload a draft Google Play internal-testing release after Play API credentials are ready.
- `Web production deploy` exports the web app and deploys `dist` to Netlify production.

These workflows are manual by design. CI still validates pushes and pull requests; release workflows should be run only when the current `main` state is intended for testers or production web users.

## Minimum internal verification before widening scope

### Auth

- Google sign-in opens the browser flow
- Google consent returns to `/auth-callback` on web
- Google consent returns to the app in the Android development build
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
- Mood tracker, Meditation, ACT, and Gratitude log show under-construction placeholder screens only

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

- `.env.self-host.example` contains only public `EXPO_PUBLIC_*` values
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
npm run start:dev-client
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
3. Run `npm exec eas-cli -- init` once if the EAS project has not been linked yet.
4. Run `npm run build:android:development`.
5. Install the generated build on the target device.
6. Run `npm run start:dev-client`.
7. Open the installed development build and verify auth, persistence, and reminder scheduling there.

## Store-readiness note

Do not move to closed testing or store submission yet. Finish:

- migration application in the active Supabase project
- web push VAPID keys, Edge Function secrets, and cron scheduling before claiming browser reminder support
- public domain and Supabase production redirect configuration
- final app name and package-name confirmation
- public support/privacy/deletion contact configuration
- privacy policy and terms legal review
- crisis/safety copy jurisdiction review
- Google Play Health apps declaration and Data safety form
- account deletion request process review
- internal device testing
- icon/screenshot/store copy polish

See [deployment.md](deployment.md), [self-hosting.md](self-hosting.md), [android-closed-testing.md](android-closed-testing.md), and [policies.md](policies.md) for launch-specific checklists.
