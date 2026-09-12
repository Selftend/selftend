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

## The two checkbox lists in a thought record

The Feelings list and the Thinking patterns list on `/modules/cbt/new` render rows below the 44px target and, on web, below the 24 x 24 WCAG 2.5.8 AA floor on height. That is a ruling, not an oversight, and it is written down here because the failure is otherwise silent and the next person to measure it would read it as a bug.

Raising those rows to a 44px minimum was measured on [#2333](https://github.com/Selftend/selftend/issues/2333) and rejected: it adds roughly 936px across the two lists against the 864px of card chrome the row shape reclaimed - a net loss on a block that was already 2,318px at 360dp. What the rows give instead:

- On native, `Checkbox` carries `COMPACT_CONTROL_HIT_SLOP`, so the 16px box is already a 44px effective target and costs no layout height.
- On both platforms the whole row is pressable, so the target spans the row rather than the label's text box - which is what it was limited to before.

Both lists render the shared `CheckboxRow` ([src/components/app/checkbox-row.tsx](../src/components/app/checkbox-row.tsx)) so they cannot drift into different row shapes. A future change proposing a 44px minimum has to beat that measurement first.

Accepted with it: at the shipped row pitch adjacent hit areas overlap slightly on native, so a sloppy tap can tick a neighbour. The failure is visible and undone in one tap.

### The patterns list folds, and the fold unmounts

Ticking a thinking pattern collapses the other sixteen ([#2350](https://github.com/Selftend/selftend/issues/2350)). `Disclosure` is unanimated and unmounts its children by ruling, so the row that was pressed is removed by the press. Two consequences, handled differently:

- **Keyboard focus is moved, not dropped.** On web the pressed row is the focused element, so focus would land on the document body. It is put on the disclosure's trigger instead - the control that now stands for what went - through `Disclosure`'s `triggerRef` and `focusNode`.
- **Where the person lands is web-only.** About 1,200px leaves in one frame while the viewport sits inside the region that goes, so the block puts itself at the top of its scroll container (`src/lib/scroll-node-to-top.ts`). On iOS and Android a `View` ref has no such method and the position is whatever the scroll offset clamps to. That is written down here because the failure is silent: closing it needs the `ScrollView` ref `MobileFormScreen` was ruled not to forward on [#2333](https://github.com/Selftend/selftend/issues/2333), which is a ruling to reopen rather than route around.

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
  sleep, gratitude and values links (#1736). Never spread it onto `role="button"`
  (react-native-web already activates buttons on Enter, and the pair double-fires) or
  onto an expo-router `Link asChild` (that renders a real anchor, which the browser
  already follows). It does not handle Space: a link never activates on Space.
  `test/link-enter-activation-guard.test.ts` (#1737) derives every element with a
  literal link role from `src/` and `app/` and fails CI when one is neither a
  `Link asChild` child nor carries the helper, when the helper lands on a button, or
  when its pinned lists no longer match the tree: the anchor-backed sites, and the
  files whose role is an expression the walk cannot read (each with its reason).
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
- [src/components/app/reserved-space.tsx](../src/components/app/reserved-space.tsx) holds the space a
  pending surface will occupy (ADR-0009). It hides the invisible measuring stick from assistive
  technology and takes no pointer events - but neither of those reaches the **Tab key**.
  react-native-web gives every `Pressable` `tabIndex="0"` unless it is disabled, so a stick built
  from the real interactive component stays focusable while invisible, inside `aria-hidden`: Tab
  lands on nothing a sighted keyboard user can see, and Enter can navigate them off the screen they
  are waiting on. **Build a stick from non-interactive twins**, as `ChipRunReservation`'s plain
  `View` pills and `ShowAllLinkStick` (the "Show all" door's face, with no press behaviour) do.
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
- `meditation_ambient_volume` — the meditation sit's looping bed, its own preference rather
  than the breathing one so a bed chosen for breathing never plays under a sit uninvited.
  `meditation_ambient_sound_id` defaults to `none`, which is the off switch.

A new audio lane without a volume control is an accessibility regression, not a follow-up.

The cues also have a non-sound counterpart. `haptic_cues` (off by default, opt-in from the
sit setup and from a running breathing session, one preference for both) taps once for each
meditation bell and once at each breath phase boundary through
[src/lib/native-haptics.ts](../src/lib/native-haptics.ts), for a person who cannot hear the
cue or sits with the bells at 0 — the tap fires at volume 0 too. It is a supplement and never
required, and it is **native only**: the module is a no-op on web and the switch is not shown
there (see Known Gaps).

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

- The haptic counterpart to the bells and breath cues is native only. The web build has no
  haptic path (`expo-haptics` would fall back to the Vibration API on a few browsers only,
  which is deliberately not wired) and hides the switch; a visual pulse for the meditation
  bell on web would be a separate piece of work.

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
