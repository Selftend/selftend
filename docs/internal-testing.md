# Internal Testing

Last updated: 2026-04-15

## Current build profiles

`eas.json` includes:

- `development`
- `preview`
- `production`

## Minimum internal verification before widening scope

### Auth

- sign up
- sign in
- sign out
- password reset request
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
npx expo export --platform web
```

## Store-readiness note

Do not move to store submission yet. Finish:

- real Supabase project setup
- privacy policy and terms
- crisis/safety copy review
- internal device testing
- icon/screenshot/store copy polish
