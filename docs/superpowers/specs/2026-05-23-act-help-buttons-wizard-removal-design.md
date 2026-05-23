# ACT: Help Buttons, Wizard Removal, Program Button — Design

**Date:** 2026-05-23  
**Scope:** Mirror CBT's per-tool help icons, remove wizard, and ensure program button is accessible in the ACT home screen.

---

## Background

CBT home screen already has:

- `HelpButton` (question-mark icon) overlaid on each strategy card and shared-tool pill
- Header with `{ type: "info" }` and `{ type: "program" }` actions; no wizard
- Program card toggled via a green flag header button

ACT home screen currently has:

- No `HelpButton` on principle cards
- A `{ type: "tune" }` wizard (personalisation) button in the header
- A program button (`{ type: "program" }`) that already exists but is buried next to the tune icon

---

## Changes

### 1. Remove wizard from ACT home screen

Strip from `act-home-screen.tsx`:

- `{ type: "tune", onPress: () => setForceWizard(true) }` from header actions
- `<ActWizard>` modal from JSX
- State: `forceWizard`, `wizardError`
- Handler: `handleWizardComplete`
- Hooks: `upsertProgramState` (`useUpsertACTProgramState`), `updatePreferences` (`useUpdateUserPreferences`), `preferences` / `prefsLoading` (`useUserPreferences`)
- Imports: `ActWizard`, `ActWizardResult`, `useUpsertACTProgramState`, `useUpdateUserPreferences`, `useUserPreferences`, `mergeUserPreferences`, `ActivityIndicator`
- The `prefsLoading` loading guard (entire early-return block)

The `ActWizard` component stays in `act-onboarding-modal.tsx` (no changes to that file).

### 2. Add HelpButton to each principle card

**`act-home-screen.tsx`**

- Add `helpKey: HelpKey` to the `PrincipleCard` interface
- Populate `helpKey` for all 6 entries in `PRINCIPLE_CARDS`:
  - `defusion` → `"defusion"`
  - `expansion` → `"expansion"`
  - `connection` → `"connection"`
  - `observingSelf` → `"observingSelf"`
  - `values` → `"values"` (already exists in help-content)
  - `committedAction` → `"committedAction"`
- In `PrincipleCardItem`, wrap the existing content in `<View className="relative ...">` and add `<HelpButton>` absolutely positioned at top-right, same as CBT's `PillarStrategyCard`
- Import `HelpButton` and `HelpKey`

**`src/features/help/help-content.ts`**

Add 5 new keys to `HELP_KEYS`: `defusion`, `expansion`, `connection`, `observingSelf`, `committedAction`.

**`src/i18n/locales/en/help.json`**

Add entries for the 5 new keys with `title`, `what`, `how`, `why` fields covering the ACT principle concepts.

**`src/i18n/locales/bg/help.json`**

Add BG translations for the same 5 keys.

### 3. Program button accessibility

No logic change required. The green flag (`{ type: "program" }`) is already wired to `showProgramPrompt` when `status === "not_started"`. After removing the tune button the icon is more prominent. Behaviour: when user dismisses the program card, the flag button remains in the header; pressing it calls `showProgramPrompt()` which clears `actProgramPromptDismissedAt` and the card reappears.

---

## Files

| File                                   | Change                                                                |
| -------------------------------------- | --------------------------------------------------------------------- |
| `src/features/act/act-home-screen.tsx` | Remove wizard; add helpKey to PrincipleCard; update PrincipleCardItem |
| `src/features/help/help-content.ts`    | Add 5 ACT principle help keys                                         |
| `src/i18n/locales/en/help.json`        | Help text for 5 ACT principles                                        |
| `src/i18n/locales/bg/help.json`        | BG translations for 5 ACT principles                                  |

No changes to `act-onboarding-modal.tsx`, `cbt-home-screen.tsx`, or database schema.
