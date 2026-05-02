# Internal Testing

Last updated: 2026-05-02

## Current build profiles

`eas.json` includes:

- `development`
- `preview`
- `production`

Use the Android `development` build as the default local runtime. Do not use Expo Go as the normal Android development path.

For Google Play closed testing, use the `production` profile to create an Android App Bundle after policy forms and store setup are ready.

## Minimum internal verification before widening scope

### Auth

- Google sign-in opens the browser flow
- Google consent returns to `/auth-callback` on web
- Google consent returns to the app in the Android development build
- magic-link email sends successfully from the sign-in screen
- magic-link email opens `/auth-callback` on web
- magic-link email opens the app through `mentalhealth://...` on device builds
- sign out
- session restore after app restart

### CBT

- create minimal valid thought record
- create fuller thought record
- edit saved record
- archive saved record
- review history list and detail screen

### Reminders

- reminders are off by default
- enabling reminders asks for permission
- disabling reminders cancels the scheduled notification

### Web / mobile smoke

- web build loads
- authenticated flow works
- thought records save and reload
- `/privacy`, `/terms`, `/crisis`, and `/account-deletion` load without sign-in
- `/auth-callback` loads directly and shows the missing-link state

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
```

Use Node `20.19.0+` so your local runtime matches the current `package.json` engine requirement before you install or test anything.

## Android development build

Use the development build instead of Expo Go for normal Android development, reminder behavior, and device verification.

1. Confirm `.env` has real Supabase values.
2. The linked Expo project ID is already configured in `app.config.ts`. Only set `EXPO_PUBLIC_EAS_PROJECT_ID` if you need to override it.
3. Run `npx eas-cli init` once if the EAS project has not been linked yet.
4. Run `npm run build:android:development`.
5. Install the generated build on the target device.
6. Run `npm run start:dev-client`.
7. Open the installed development build and verify auth, persistence, and reminder scheduling there.

## Store-readiness note

Do not move to closed testing or store submission yet. Finish:

- migration application in the active Supabase project
- public domain and Supabase production redirect configuration
- final app name and package-name confirmation
- public support/privacy/deletion contact configuration
- privacy policy and terms legal review
- crisis/safety copy jurisdiction review
- Google Play Health apps declaration and Data safety form
- account deletion request process review
- internal device testing
- icon/screenshot/store copy polish

See [deployment.md](deployment.md), [android-closed-testing.md](android-closed-testing.md), and [policies.md](policies.md) for launch-specific checklists.
