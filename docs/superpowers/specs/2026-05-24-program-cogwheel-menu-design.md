# Program Cogwheel Menu Design

**Date:** 2026-05-24
**Status:** Approved

## Problem

The "Abandon program" action is buried — previously as a standalone button at the bottom of the in-progress card, before that inside the collapsible "Other weeks" section. Neither placement is discoverable or appropriate for a destructive action that should feel deliberate but accessible.

## Decision

Add a cogwheel icon button to the `in_progress` header row of `ProgramHero`, to the right of the existing `HelpButton`. Tapping it opens a `Popover` with a single destructive menu item: "Abandon program". Tapping that item calls `onAbandon()` and closes the popover.

The existing standalone abandon `Button` at the bottom of the card is removed.

## Component

**File:** `src/components/app/program-hero.tsx`

This component is shared by CBT and ACT programs via the `namespace` prop, so both programs get the cogwheel for free.

### Header row (in_progress state only)

```
[ Program title — Week theme ]  [ ⚙ ]  [ ? ]
```

- Cogwheel uses `Icon name="settings"`, same size as `HelpButton` (18)
- Rendered only when `onAbandon` is provided
- Uses `Popover` / `PopoverTrigger` / `PopoverContent` from `@/src/components/react-native-reusables/popover` — same pattern as `UserMenu`
- `PopoverTrigger` wraps a ghost icon button with `accessibilityLabel={t("program.manageLabel")}`
- `PopoverContent` contains one `Pressable` row: destructive red text "Abandon program" with a `warning` icon; pressing it calls `onAbandon()` then closes the popover via a `triggerRef`

### Removed

- The `{onAbandon ? <Button ...>Abandon</Button> : null}` block at the bottom of the `in_progress` return

## i18n

One new key needed in `en/cbt.json` and `bg/cbt.json` under `"program"`:

```json
"manageLabel": "Program options"
```

(Bulgarian: `"Опции на програмата"`)

The `program.abandon` key already exists in both locales — no change needed there.

## Tests

`src/components/app/program-hero.test.tsx`:

- Update the "calls onAbandon" test: press the cogwheel button (`getByLabelText("Program options")`), then press "Abandon program"
- The fixture weeks array already uses unique keys — no change needed there

## Out of Scope

- Additional menu items (future)
- Cogwheel in `not_started` state (nothing to abandon)
- Any ACT/CBT-specific menu items
