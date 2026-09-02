# Accessibility

Accessibility is part of the app foundation, not a polish pass. Users must be able to move calmly through the app with screen readers, keyboards, switch controls, larger text, reduced motion, and high-contrast settings.

## Baseline

- All actionable UI has an accessible name from i18n. Visible text can be the name; icon-only and card-like actions need `accessibilityLabel`.
- Use `accessibilityHint` only when the label does not explain the result of the action.
- Use semantic state: `disabled`, `selected`, `checked`, `expanded`, and `busy` where it applies.
- Keep controls keyboard reachable on web and preserve the existing visible focus ring classes.
- Keep text scalable. Do not set `allowFontScaling={false}` unless there is a documented safety reason.
- Use theme tokens instead of one-off colors, then verify contrast in light and dark modes.
- Prefer 44 x 44 visual targets. If a compact visual control is smaller, use shared hit slop so the touch target remains forgiving on native.
- On web, `hitSlop` does nothing: react-native-web targets the DOM box. A web control that must clear the 24 x 24 WCAG 2.5.8 AA floor has to get there through real padding or a real height.
- Respect reduced motion for modals, menus, and animated wrappers.
- Keep crisis and safety guidance reachable without sign-in.

## Supported width floor

**The narrowest supported viewport is 360dp.** 320dp is explicitly **not** supported, and the difference is not cosmetic: below roughly 324px the compact 12-hour time control on the reminders screen paints over that row's switch (measured 3.5px of overlap at 320px). That was ruled acceptable rather than fixed, so it is written down here — the failure is silent otherwise, and the next person to measure it would read it as a bug.

Two consequences for anything laid out narrow:

- Design and measure against 360dp, not 320dp. Widths that only work above 375dp are still bugs.
- A phone-width regression test should set the viewport to 360 (`test/e2e/journal-overview.e2e.test.ts` is the existing example), because the jest default of 750px and Playwright's Desktop Chrome default both hide every phone branch.

## Code Defaults

Shared accessibility helpers live in [src/lib/accessibility.ts](../src/lib/accessibility.ts):

- `MIN_TOUCH_TARGET_SIZE` documents the project target.
- `DEFAULT_INTERACTIVE_HIT_SLOP` is for buttons, card links, navigation rows, and select triggers.
- `COMPACT_CONTROL_HIT_SLOP` is for compact switches, checkboxes, and radio controls.
- `useReduceMotionEnabled()` listens to the platform reduce-motion setting.
- `spaceKeyActivationProps()` adds web-only Space activation to checkbox/radio/switch-role
  Pressables (react-native-web only synthesizes click-on-Space for `role="button"`); it
  ignores OS key auto-repeat. Spread it onto any raw Pressable with a toggle role. Never
  combine it with `role="button"` - react-native-web already activates Space there, and
  the pair double-fires (the control toggles on at keydown and back off at keyup).
- `enterKeyActivationProps()` adds web-only Enter activation to a `role="link"` Pressable
  that has no `href`. react-native-web treats a link as a native anchor and leaves its
  Enter to the browser, but an href-less Pressable renders `<div role="link">`, which the
  browser does nothing with - Tab reaches it, Enter is dead. Spread it onto every such
  Pressable, and skip it when the element is disabled. The shared components do (the
  "Show all" door, the shared-tools chips, the breadcrumb, the sidebar's donate row, the
  settings colophon and the external settings row), and so do the screen-local links in
  the habits, meditation, journal and mood screens (#1735) and the CBT route screens'
  sleep, gratitude and values links (#1736); a guard against the next bare `role="link"`
  is tracked as #1737 under #1730. Never spread it onto `role="button"`
  (react-native-web already activates buttons on Enter, and the pair double-fires) or
  onto an expo-router `Link asChild` (that renders a real anchor, which the browser
  already follows). It does not handle Space: a link never activates on Space.
- `toggleButtonStateProps(pressed)` is the state for add/remove toggle buttons:
  `aria-pressed` on web (the valid ARIA for a toggle), the selected announcement on native.
- `currentStateProps(active, "page" | "step")` is the "you are here" state for navigation
  and step controls: `aria-current` on web (omitted entirely when inactive), the selected
  announcement on native. Buttons that indicate the current item keep `role="button"`.
- Announcements are dual-surface: render the visible message node with
  `politeLiveRegionProps()` (a polite live region on web, nothing on native) AND call
  `announceMessage(message)` when it appears (native `announceForAccessibility`, a no-op
  on web - react-native-web does not implement announcements). Inline form errors and the
  landing carousel both follow this pattern.
- `useRovingFocus({ count, activeIndex, onActivate })` in
  [src/lib/roving-focus.ts](../src/lib/roving-focus.ts) gives composite widgets
  (radiogroups, tablists) the roving-tabindex pattern on web: only the active item is
  tabbable, Arrow/Home/End keys move focus and activate on move. Spread
  `getItemProps(index, onPress)` onto each item and pass the item's `onPress` as the
  second argument for Space activation - never spread `spaceKeyActivationProps` alongside
  it, since both helpers own `onKeyDown` and the second spread clobbers the first.
- Use `aria-checked` / `aria-selected` / `aria-expanded` / `aria-disabled` / `aria-busy`
  instead of the object-form `accessibilityState`, which react-native-web silently drops
  (an ESLint rule enforces this outside the react-native-reusables wrappers).

- [src/components/react-native-reusables/button.tsx](../src/components/react-native-reusables/button.tsx), [src/components/react-native-reusables/select.tsx](../src/components/react-native-reusables/select.tsx), [src/components/react-native-reusables/switch.tsx](../src/components/react-native-reusables/switch.tsx), [src/components/react-native-reusables/checkbox.tsx](../src/components/react-native-reusables/checkbox.tsx), and [src/components/react-native-reusables/radio-group.tsx](../src/components/react-native-reusables/radio-group.tsx) set baseline roles, states, and hit slop.
- [src/components/react-native-reusables/native-only-animated-view.tsx](../src/components/react-native-reusables/native-only-animated-view.tsx) drops entering, exiting, and layout animations when reduced motion is enabled.
- [src/components/app/accessible-card-link.tsx](../src/components/app/accessible-card-link.tsx) is the default pattern for card-shaped navigation actions.
- Onboarding and avatar-crop modals switch from fade animation to no animation when reduced motion is enabled.
- Required policy consent uses a full-screen gate instead of a modal so linked Privacy Policy and Terms pages remain readable and reachable.

### Sound

The app deliberately plays through the iOS ring/silent switch. `ensureNativeAudioMode()`
in [src/lib/native-audio.ts](../src/lib/native-audio.ts) sets `playsInSilentMode: true`
once per app run, because guided breathing and meditation audio are _requested_ — the user
pressed Begin — and many people leave the switch on permanently, for whom silence would
read as the feature being broken rather than as restraint.

That decision is app-wide and cannot be narrowed to one sound. `setAudioModeAsync`
configures the app's global audio session, not an individual player, so "the bells respect
the switch but a running breathing session does not" is not expressible without flipping
the global category around each clip and racing whatever else is playing.

The in-app volume controls are therefore the real remedy for sound sensitivity, and they
have to be complete for that reason. Every lane that can make noise has one, all of them
persisted on `user_preferences`:

- `breath_volume` and `ambient_volume` — the breathing session's two lanes.
- `bell_volume` — all three meditation bells; **0 is off**, and at 0 nothing is played and
  the global audio session is never configured at all.

A new audio lane without a volume control is an accessibility regression, not a follow-up.

## Contributor Checklist

Before opening a PR that adds or changes UI:

1. Navigate the changed screen with keyboard only on web.
2. Check the screen with a screen reader or platform accessibility inspector.
3. Verify every icon-only button, card action, checkbox, switch, select, and input has a useful accessible name.
4. Verify disabled, selected, checked, expanded, loading, and destructive states are announced where relevant.
5. Check light and dark mode contrast, including muted text, destructive states, and focus rings.
6. Test at larger system text sizes where the platform makes that practical.
7. Turn on reduced motion and confirm the flow still works without required animation.
8. Keep all new accessibility strings in every locale file, not hardcoded in components.

## Known Gaps

These should be addressed as MVP flows expand:

- Add focused component tests for each new module's critical accessible actions, not just visual text.
- Add manual screen-reader notes to the release checklist once Android and web device testing resumes.
- Revisit focus management for dialogs and route changes after the main MVP flows stabilize.
- Consider automated web accessibility checks only after the UI routes are stable enough that the signal is useful.
- The web role pass is DONE for the main clusters: exclusive choice chips and pickers are
  `radiogroup`/`radio` with `aria-checked` and roving focus, the segmented control is
  `tablist`/`tab`, sidebar and wizard-step actives use `currentStateProps` (`aria-current`),
  and add/remove or multi-select toggles use `toggleButtonStateProps` (`aria-pressed`).
  Remaining in this area:
  - Date-bar day chips have radio roles but NO roving focus (deliberate: the strip is a
    virtualized, infinitely-growing FlatList, so focus-follow to unmounted cells is
    unreliable and per-index roving props would defeat its memoized cells).
  - The segmented control's tabs are not linked to their panels via
    `aria-controls`/`tabpanel` yet.
  - NumberRating rows still expose plain buttons.

Reference standards checked on 2026-05-08:

- React Native Accessibility and `AccessibilityInfo`: https://reactnative.dev/docs/accessibility.html and https://reactnative.dev/docs/accessibilityinfo
- WCAG 2.2 target-size guidance: https://www.w3.org/TR/wcag/
