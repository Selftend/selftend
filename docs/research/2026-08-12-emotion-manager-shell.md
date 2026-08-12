# Emotion-manager dialog/drawer shell

Date: 2026-08-12 · Map: #898 · Ticket: #904 (research) · Blocks: #905

Design page 2E draws Manage/Edit emotions as a **centered dialog on desktop**
and a **bottom drawer on mobile**. Today both views live in one RN `Modal` with
`presentationStyle="pageSheet"` (`src/features/mood/manage-emotions-modal.tsx:265-271`),
which on web renders full-viewport. The owner also asked: **"can the drawer be
a native element?"** This note compares the four candidate mechanisms against
primary sources and ends with a recommendation.

## Headline

**Keep RN `Modal` as the shell and fork only the web presentation**: native
keeps `presentationStyle="pageSheet"` (which on iOS already _is_ a native
bottom sheet — UIKit's `UIModalPresentationPageSheet`), while a web variant
switches to `transparent` and styles the panel itself — centered card at
desktop widths, bottom-anchored drawer below the breakpoint. react-native-web's
`Modal` already supplies the portal, focus trap, `Escape`→`onRequestClose`, and
`aria-modal` that the web presentation needs; nothing new is installed and
every ticket constraint is met by code that already exists in the file.

Answer to "can the drawer be a native element?": **on iOS it already is one**
(a real UIKit sheet view controller); **on web a native `<dialog>` is feasible
but redundant** — it would re-buy focus containment RNW Modal already provides,
at the cost of an imperative `showModal()` ref dance and manual backdrop-click
handling (`closedby` is not Baseline).

## Premise checks

- **"@rn-primitives/dialog — already an approved dependency in the suite"** —
  the _suite_ is approved (AGENTS.md lists @rn-primitives as the UI-primitive
  default), but the `dialog` package is **not installed**. `package.json` has
  only `avatar`, `checkbox`, `label`, `popover`, `portal`, `slot`, `switch`
  (all `^1.4.0`). Adding it would be a trivially-justified install, but it is
  an install, not an already-present tool.
- **"on web renders full-viewport (owner screenshot 6)"** — confirmed from
  source, see below. Correct premise.

## 1. RN `Modal` `presentationStyle` (react-native 0.86.0)

- `presentationStyle` is **iOS-only**: `'fullScreen' | 'pageSheet' |
'formSheet' | 'overFullScreen'`
  ([docs](https://reactnative.dev/docs/modal#presentationstyle-ios)).
- On iOS it maps 1:1 to UIKit in
  `RCTModalHostViewComponentView.mm` (0.86-stable): `pageSheet →
UIModalPresentationPageSheet`, `formSheet → UIModalPresentationFormSheet`,
  presented via a real `presentViewController:` call — **a genuine native
  sheet**, the card-style drawer iOS has rendered for pageSheet since iOS 13
  ([source](https://github.com/facebook/react-native/blob/0.86-stable/packages/react-native/React/Fabric/Mounting/ComponentViews/Modal/RCTModalHostViewComponentView.mm),
  [UIKit reference](https://developer.apple.com/documentation/uikit/uimodalpresentationstyle)).
- `transparent` overrides it: the native layer returns
  `UIModalPresentationOverFullScreen` whenever `props.transparent`, and the JS
  layer warns about the combination
  ([Modal.js](https://github.com/facebook/react-native/blob/0.86-stable/packages/react-native/Libraries/Modal/Modal.js)).
  So the native sheet and a self-styled transparent overlay are **mutually
  exclusive on iOS** — a shell cannot have both at once.
- **Android ignores `presentationStyle` entirely** (zero mentions in
  `ReactModalHostView.kt`). RN Modal on Android is a **native
  `android.app.Dialog`** (`ComponentDialog`) with full-screen themes selected
  by `animationType`; `transparent` toggles `FLAG_DIM_BEHIND`
  ([source](https://github.com/facebook/react-native/blob/0.86-stable/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/views/modal/ReactModalHostView.kt)).
  Back-button dismissal comes from the Dialog via `onRequestClose`.

## 2. react-native-web `Modal` (~0.21.0)

From `packages/react-native-web/src/exports/Modal/` (necolas/react-native-web):

- **Portal of plain divs**, not `<dialog>`: `ModalPortal.js` appends a bare
  `div` to `document.body` and renders via `createPortal`
  ([source](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web/src/exports/Modal/ModalPortal.js)).
- Composition is `ModalPortal → ModalAnimation → ModalFocusTrap →
ModalContent`. **`presentationStyle` is never read** — the destructured props
  are `animationType, children, onDismiss, onRequestClose, onShow, transparent,
visible`
  ([index.js](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web/src/exports/Modal/index.js)).
- `ModalContent.js` styles the layer `position: fixed; inset: 0`, sets
  `aria-modal` and `role="dialog"` (while topmost), listens for **Escape** on
  `document` and calls `onRequestClose`; with `transparent={false}` the
  background is white — hence the full-viewport screenshot. With
  `transparent={true}` the layer is a transparent fixed overlay you style
  yourself
  ([source](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web/src/exports/Modal/ModalContent.js)).
- `ModalFocusTrap.js` is a real **focus trap**: sentinel brackets redirect
  focus back into the modal in both tab directions, and focus is restored to
  the previously-focused element on unmount
  ([source](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web/src/exports/Modal/ModalFocusTrap.js)).
- `animationType` works on web: `slide` = translateY 100%→0 keyframes, `fade`,
  `none` instant; 250ms
  ([ModalAnimation.js](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web/src/exports/Modal/ModalAnimation.js)).

**Upshot:** the current shell's web problem is only the missing `transparent` +
panel styling. The trap, Escape handling, aria wiring, portal, and slide
animation the design needs are already in RNW Modal.

## 3. @rn-primitives/dialog (v1.5.x, not installed)

Canonical source: `roninoss/rn-primitives`, `packages/dialog`.

- **Web** (`dialog.web.tsx`): a thin wrapper over **@radix-ui/react-dialog**
  (real dependency `^1.1.15`) — portal to body, focus trap, aria, Escape,
  outside-click, `onInteractOutside` etc. **No styling or centering of its
  own**
  ([source](https://github.com/roninoss/rn-primitives/blob/main/packages/dialog/src/dialog.web.tsx),
  [package.json](https://github.com/roninoss/rn-primitives/blob/main/packages/dialog/package.json)).
- **Native** (`dialog.tsx`): **no RN Modal** — renders through
  `@rn-primitives/portal`, whose `PortalHost` renders children as bare
  fragments at its own tree position
  ([portal source](https://github.com/roninoss/rn-primitives/blob/main/packages/portal/src/portal.tsx)).
  Overlay is an unstyled `Pressable`, Content an unstyled `View` with
  `role="dialog"`/`aria-modal`; Android back is handled via a `BackHandler`
  listener. **The consumer positions everything** — no native sheet, no
  centering, no keyboard avoidance
  ([source](https://github.com/roninoss/rn-primitives/blob/main/packages/dialog/src/dialog.tsx),
  [docs](https://rnprimitives.com/dialog/)).
- **Presentation-agnostic**: centered card vs bottom drawer is 100% consumer
  styling (react-native-reusables' Dialog demonstrates the centered-card
  styling on top of it,
  [source](https://github.com/founded-labs/react-native-reusables/blob/main/packages/registry/src/nativewind/components/ui/dialog.tsx)).
- Gesture note: our root layout mounts `<PortalHost />` _inside_
  `GestureHandlerRootView` (`app/_layout.tsx:90-105`), so portal content would
  satisfy the Sortable requirement via the root GHRV — the one structural
  advantage over RN Modal, which spawns a separate native container and needs
  its own GHRV (which the current file already has).

## 4. Native web `<dialog>`

- `showModal()` gives, browser-provided: **top layer**, `::backdrop`,
  **inert background** ("Elements inside the same document as the dialog,
  except the dialog and its descendants, become inert"), initial focus, and
  **Esc-to-close** — Baseline Widely available since **March 2022**
  ([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog),
  [MDN showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)).
  Focus containment is inert-based rather than a JS trap loop — equivalent in
  effect.
- **Feasible without ejecting anything**: RNW "builds upon React DOM"
  ([RNW docs](https://necolas.github.io/react-native-web/docs/)), so a
  `.web.tsx` file can render literal `<dialog>` JSX around RNW Views, and
  React supports `<dialog>` with `onCancel`/`onClose`
  ([react.dev](https://react.dev/reference/react-dom/components/common)). The
  element stays in the DOM tree (top layer is a rendering concept), so theme
  CSS variables from the themed root View still inherit.
- Caveats: `showModal()` is imperative (ref + effect; the declarative `open`
  attribute gives only a _non-modal_ dialog); backdrop-click dismissal is
  manual because **`closedby` is not Baseline**
  ([MDN closedBy](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/closedBy));
  Esc fires `cancel`, which must be intercepted to preserve the
  editor-closes-first behavior. RNW's own Modal does not use `<dialog>`.

## 5. Expo Router modal routes (expo-router ~57)

- Route-based modals (`presentation: 'modal'` / `'formSheet'` with
  `sheetAllowedDetents`) keep the previous screen mounted in-session (stack
  screens stay mounted,
  [React Navigation lifecycle](https://reactnavigation.org/docs/navigation-lifecycle/)),
  so the check-in editor's form state survives _navigation_ — but the modal
  gets its own URL, and a web reload/deep-link onto it reconstructs only the
  anchor route, not the editor's in-memory form state
  ([Expo modals](https://docs.expo.dev/router/advanced/modals/)).
- Web overlay presentation (centered lightbox ≥768px, bottom sheet below)
  exists only behind **`EXPO_UNSTABLE_WEB_MODAL=1`**, an unstable flag; without
  it a web modal route is a plain full page
  ([Expo web modals](https://docs.expo.dev/router/advanced/web-modals/)).
- The surface is also owned by the editor (`mood-entry-editor-screen.tsx:193`
  holds `manageEmotionsOpen`; the modal mutates via hooks that assume the
  session context, and `visible` gates the usage-count query) — a route would
  force that coupling through params/stores for no gain.

## Constraint scorecard

| Constraint                       | RN Modal (web-forked)                                                     | @rn-primitives/dialog                                | raw `<dialog>` (web)            | Router modal route                         |
| -------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| One dismiss layer (#743)         | ✅ unchanged — two views, one Modal, `onRequestClose` editor-aware        | ✅ same pattern possible                             | ✅ intercept `cancel`           | ⚠️ back gesture becomes navigation pop     |
| Sortable needs GHRV              | ✅ already inside the Modal                                               | ✅ via root GHRV (portal)                            | ✅ web only; native unchanged   | ✅                                         |
| Keyboard avoidance               | ✅ existing KAV `padding` works in Modal                                  | ⚠️ manual (primitive has none)                       | n/a (web)                       | ✅                                         |
| Reduce motion                    | ✅ `animationType` already gated                                          | ⚠️ consumer-built                                    | ⚠️ CSS `prefers-reduced-motion` | ⚠️ screen-options level                    |
| Web focus trap                   | ✅ ModalFocusTrap + Escape + aria                                         | ✅ Radix                                             | ✅ inert-based                  | ⚠️ unstable flag                           |
| Dependency policy                | ✅ zero additions                                                         | ⚠️ one install (approved suite, brings Radix on web) | ✅ zero additions               | ✅ built-in but unstable flag              |
| Centered desktop / drawer mobile | ✅ `transparent` + breakpoint styling on web; iOS pageSheet is the drawer | ✅ all styling by hand on both platforms             | ✅ web half only                | ⚠️ 768px fixed, `webModalStyle` knobs only |

## Recommendation

**Keep the RN `Modal` shell; change only the web presentation.**

- **Native: no shell change.** `presentationStyle="pageSheet"` is already the
  design's mobile bottom drawer on iOS — and a _native element_ in the fullest
  sense (a UIKit sheet view controller). Android keeps its conventional
  full-screen native Dialog with hardware-back dismissal; a partial-height
  drawer there would require giving up the native Dialog chrome for a
  `transparent` self-styled panel, which the build ticket may adopt only if
  the design insists on a literal partial-height drawer on Android.
- **Web: fork the presentation** (`Platform.OS === "web"` or a
  `.web.tsx` shell): `transparent={true}`, a self-styled backdrop
  (`bg-black/50`, pressable → same editor-aware close as `onRequestClose`),
  and a panel that is a centered `max-w`-card when `useWindowDimensions().width`
  clears a breakpoint (follow the `src/constants/layout.ts`
  `NARROW_STEP_INDICATOR_BREAKPOINT` convention) and a bottom-anchored
  rounded-top drawer below it. `animationType` stays
  `reduceMotionEnabled ? "none" : "slide"` (slide reads correctly for the
  drawer; the desktop card may prefer `"fade"`). Focus trap, Escape, aria, and
  portal come from RNW Modal unchanged. Web keyboard behavior is unchanged
  (KAV is a no-op on web by design; `useWebKeyboardInset` hooks remain the
  web answer).
- Everything inside the Modal — the two-view state machine, `GestureHandlerRootView`,
  `Sortable.Grid`, `KeyboardAvoidingView` — is untouched, so #743's one-dismiss-layer
  decision is preserved by construction.

**Rejected:**

- **@rn-primitives/dialog** — on native it is strictly less than what we have
  (no native sheet, no keyboard handling, back/overlay/positioning all
  rebuilt by hand), and its web win (Radix focus trap) duplicates what RNW
  Modal already ships. One install buys nothing the shell needs.
- **Raw web `<dialog>`** — genuinely viable (see §4) and the honest answer to
  "native element on web", but it re-implements only the web half, adds an
  imperative `showModal()` lifecycle plus manual backdrop-click (no Baseline
  `closedby`), and drops RNW's focus-restore-on-unmount for browser defaults.
  Keep it in the back pocket if RNW Modal's trap ever proves insufficient.
- **Expo Router modal route** — gated on an unstable env flag for its web
  overlay, hard-reload semantics that cannot restore the editor's in-memory
  form state, a fixed 768px breakpoint, and it would force the editor↔modal
  state coupling through route params. Wrong tool for a surface owned by a
  form screen.

**Answer to the owner's question ("can the drawer be a native element?"):**

- **Native iOS: yes, and it already is.** `pageSheet` presents through
  `UIModalPresentationPageSheet` — a real UIKit sheet, not a styled View.
  (`formSheet`/detents via RN Modal are not exposed beyond the four
  presentation styles; Android has no native sheet through RN Modal at all.)
- **Web: yes, feasibly** — a `<dialog ref>.showModal()` in a `.web.tsx` works
  inside our RNW tree and gives top-layer/backdrop/inert/Esc for free — but it
  is not _needed_: RNW Modal already provides the modal semantics, so the
  recommendation styles that instead.
