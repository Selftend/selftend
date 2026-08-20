# Prototype: the update popup's shape (#1153)

Throwaway. Not imported by the app, not shipped. Delete once the #1142 spec lands.

Kept out of `src/` on purpose: `test/i18n-key-coverage.test.ts` scans `app/` and
`src/` for `t("...")` literals, and this prototype names keys that do not exist
yet — naming them is #1150's decision, not this ticket's.

| File                    | What it is                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `update-popup.tsx`      | The decided shape. Reasoning lives in its docblock.                                       |
| `update-popup.test.tsx` | Pins "Later" first in the tree — which is what focuses it on web.                         |
| `focus-probe.html/.mjs` | The Chromium probe behind that claim. `node prototypes/1153-update-popup/focus-probe.mjs` |

## What the probe settled

react-native-web's `ModalFocusTrap` focuses the first focusable descendant when
the modal opens, so **button order is the C1 focus mechanism** — no ref, no
`autoFocus`. Varying only the scrim node:

| Scrim node                    | Focus lands on | C1     |
| ----------------------------- | -------------- | ------ |
| plain `View`                  | Later          | holds  |
| `Pressable`                   | the scrim      | broken |
| `Pressable focusable={false}` | the scrim      | broken |
| no role, no tabIndex          | Later          | holds  |

☠️ `focusable={false}` compiles to `tabindex="-1"`, and RNW's `attemptFocus`
calls `.focus()` programmatically — which succeeds on a `tabindex="-1"` element.
The scrim still steals focus. RNW's `Pressable` always emits a `tabIndex`, so no
pressable scrim placed before the card can avoid this. Hence: no scrim tap,
matching `ConfirmDialog`.

Review page: https://claude.ai/code/artifact/a7534758-f3ef-48fb-b80d-fdcacc159dfa
