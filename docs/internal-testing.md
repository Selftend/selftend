# Internal Testing

Last updated: 2026-04-16

## Current build profiles

`eas.json` includes:

- `development`
- `preview`
- `production`

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

## Recommended commands

```bash
npm run typecheck
npm test -- --runInBand
npm run start:dev-client
npm run build:android:development
npx expo export --platform web
```

## Android development build

Use the development build instead of Expo Go when testing reminder behavior on Android.

1. Confirm `.env` has real Supabase values.
2. The linked Expo project ID is already configured in `app.config.ts`. Only set `EXPO_PUBLIC_EAS_PROJECT_ID` if you need to override it.
3. Run `npx eas-cli init` once if the EAS project has not been linked yet.
4. Run `npm run build:android:development`.
5. Install the generated build on the target device.
6. Run `npm run start:dev-client`.
7. Open the installed development build and verify auth, persistence, and reminder scheduling there.

## Store-readiness note

Do not move to store submission yet. Finish:

- real Supabase project setup
- privacy policy and terms
- crisis/safety copy review
- internal device testing
- icon/screenshot/store copy polish
