# Accessibility

Accessibility is part of the app foundation, not a polish pass. Selftend is a mental-health self-help product, so users must be able to move through the app calmly with screen readers, keyboards, switch controls, larger text, reduced motion, and high-contrast settings.

## Baseline

Use these rules for every new screen and shared component:

- All actionable UI has an accessible name from i18n. Visible text can be the name; icon-only and card-like actions need `accessibilityLabel`.
- Use `accessibilityHint` only when the label does not explain the result of the action.
- Use semantic state: `disabled`, `selected`, `checked`, `expanded`, and `busy` where it applies.
- Keep controls keyboard reachable on web and preserve the existing visible focus ring classes.
- Keep text scalable. Do not set `allowFontScaling={false}` unless there is a documented safety reason.
- Use theme tokens instead of one-off colors, then verify contrast in light and dark modes.
- Prefer 44 x 44 visual targets. If a compact visual control is smaller, use shared hit slop so the touch target remains forgiving on native.
- Respect reduced motion for modals, menus, and animated wrappers.
- Keep crisis and safety guidance reachable without sign-in.

## Code Defaults

Shared accessibility helpers live in [src/lib/accessibility.ts](../src/lib/accessibility.ts):

- `MIN_TOUCH_TARGET_SIZE` documents the project target.
- `DEFAULT_INTERACTIVE_HIT_SLOP` is for buttons, card links, navigation rows, and select triggers.
- `COMPACT_CONTROL_HIT_SLOP` is for compact switches, checkboxes, and radio controls.
- `useReduceMotionEnabled()` listens to the platform reduce-motion setting.

Current component defaults:

- [components/ui/button.tsx](../components/ui/button.tsx), [components/ui/select.tsx](../components/ui/select.tsx), [components/ui/switch.tsx](../components/ui/switch.tsx), [components/ui/checkbox.tsx](../components/ui/checkbox.tsx), and [components/ui/radio-group.tsx](../components/ui/radio-group.tsx) set baseline roles, states, and hit slop.
- [components/ui/native-only-animated-view.tsx](../components/ui/native-only-animated-view.tsx) drops entering, exiting, and layout animations when reduced motion is enabled.
- [src/components/accessible-card-link.tsx](../src/components/accessible-card-link.tsx) is the default pattern for card-shaped navigation actions.
- Onboarding, consent, and avatar-crop modals switch from fade animation to no animation when reduced motion is enabled.

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

Reference standards checked on 2026-05-08:

- React Native Accessibility and `AccessibilityInfo`: https://reactnative.dev/docs/accessibility.html and https://reactnative.dev/docs/accessibilityinfo
- WCAG 2.2 target-size guidance: https://www.w3.org/TR/wcag/
