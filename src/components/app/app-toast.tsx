import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardDescription, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { NativeOnlyAnimatedView } from "@/src/components/react-native-reusables/native-only-animated-view";
import {
  DEFAULT_INTERACTIVE_HIT_SLOP,
  announceMessage,
  useReduceMotionEnabled,
} from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";
import {
  SUCCESS_TOAST_MS,
  useToastStore,
  type Toast,
  type ToastTone,
} from "@/src/stores/toast-store";

/**
 * A module-scope constant is fine HERE because every value is a token CLASS
 * NAME, never a resolved colour - the static-accent trap only fires when a
 * themed colour is frozen at module scope. Keep it that way.
 *
 * The icon colours are deliberately asymmetric: `text-primary-ink` against
 * `text-destructive`. There is no `--destructive-ink` because `contrast.ts`
 * already gates raw `--destructive` at AA on card, while raw `--primary` is
 * not - which is the whole reason `--primary-ink` exists.
 */
const TONE: Record<ToastTone, { bar: string; ink: string; icon: MaterialIconName }> = {
  success: { bar: "bg-primary", ink: "text-primary-ink", icon: "check-circle" },
  error: { bar: "bg-destructive", ink: "text-destructive", icon: "error" },
};

/**
 * What a screen reader speaks. A title-only toast (the #1064 convention, and 66
 * of the app's 90 toasts) must not read "Something did not save. undefined".
 */
function composeLabel({ title, description }: Toast): string {
  return description ? `${title}. ${description}` : title;
}

export function AppToast() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  // Through the hook, never `getState()`: an imperative store read in render is
  // the React Compiler purity trap. `getState()` stays correct for the imperative
  // WRITES outside React, like `query-client.ts`'s global save-failed toast.
  const toast = useToastStore((state) => state.visible);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const reduceMotionEnabled = useReduceMotionEnabled();
  const label = toast ? composeLabel(toast) : null;

  // The store is a pure state machine, so the dismiss timer lives here (#1336),
  // keyed on the visible toast's identity so a promoted queue entry gets its own
  // full 2500ms rather than inheriting what was left of its predecessor's.
  //
  // No timeout is EVER scheduled for an error: an error stays until the user
  // dismisses it. That is why the guard is `tone !== "success"` rather than a
  // null check - a new tone could not silently acquire a timer.
  useEffect(() => {
    if (toast?.tone !== "success") {
      return;
    }

    const timeout = setTimeout(dismissToast, SUCCESS_TOAST_MS);
    return () => clearTimeout(timeout);
    // Keyed on the id rather than on `toast` itself: identity is the store's to
    // change, but the id is the toast's own, so nothing short of a genuinely
    // different toast can restart the countdown.
  }, [dismissToast, toast?.id, toast?.tone]);

  // `accessibilityLiveRegion` is ANDROID-ONLY in RN core, so without this the
  // toast is announced by nothing at all on iOS (#1337). Gated to iOS rather
  // than to "not web": Android has both mechanisms and would announce twice.
  //
  // ☠️ The tone does not survive the trip - `announceForAccessibility` has no
  // severity channel, so an iOS user hears the sentence without "error". A
  // severity prefix was considered and rejected; recorded here rather than
  // papered over.
  //
  // `label` is a string, so including it satisfies exhaustive-deps without
  // re-announcing on every render; `toast?.id` is what forces a re-announce
  // when the same sentence arrives twice.
  useEffect(() => {
    if (Platform.OS !== "ios" || !label) {
      return;
    }

    announceMessage(label);
  }, [label, toast?.id]);

  if (!toast || !label) {
    return null;
  }

  const tone = TONE[toast.tone];

  return (
    <View
      // box-none must be the prop, not style.pointerEvents: "box-none" is invalid CSS
      // and gets ignored when passed via NativeWind's style, leaving this overlay
      // interactive and able to swallow taps. The prop uses RNW's box-none polyfill.
      pointerEvents="box-none"
      className="absolute inset-x-0 z-[80] items-center px-4"
      style={{ top: insets.top + 12 }}
    >
      <View className="w-full max-w-xl">
        {/*
          Entrance only. There is no exit fade: it would need host-side shadow
          state the pure store deliberately withholds, a fading-out toast is
          still hit-testable (a phantom X over the UI), and `animate-out`
          appears nowhere in this repo.

          On web this renders a fragment, so the web half of the fade rides on
          the Card's own className below rather than on this wrapper.
        */}
        <NativeOnlyAnimatedView entering={FadeIn.duration(200)}>
          <Card
            // The composed label lives on the card, but `accessible` deliberately
            // does NOT. On iOS an accessibility element hides its descendants, so
            // a labelled AND accessible card would take the X away from VoiceOver
            // - silently, on the one platform with no test layer. `program-card`
            // is the shape: the control carries its own label, the container none.
            accessibilityLabel={label}
            accessibilityLiveRegion={toast.tone === "error" ? "assertive" : "polite"}
            className={cn(
              "w-full gap-0 py-4 shadow-md dark:shadow-none",
              // `animate-in fade-in-0` alone is transform-free. Do NOT reach for
              // popover's class list: it carries `zoom-in-95` and
              // `slide-in-from-top-2`, exactly the transform this rework forbids.
              // `duration-200` overrides animate-in's 150ms default and pins web
              // to the same 200ms as native - unpinned, the two diverge 2x.
              //
              // ☠️ `Platform.OS === "web"`, NOT `Platform.select({ web })`. RN
              // bakes `select` per platform - the iOS build's is literally
              // `'ios' in spec ? ... : spec.default` - so it never consults
              // `Platform.OS` and returns undefined under jest no matter what
              // the test sets. `select` would make this branch unobservable.
              Platform.OS === "web" && !reduceMotionEnabled && "animate-in fade-in-0 duration-200",
            )}
            // Scoping handle for the specs that assert on toast CONTENT rather than on
            // the toast existing - `gdpr-export.e2e` moved onto it when the export's
            // permanent success line became a toast (#982). Without it a spec has to
            // match the copy anywhere on the page, which passes just as happily
            // against a stale permanent node.
            testID="app-toast"
          >
            {/*
              Decorative, and redundant with both the icon and the copy - the
              border stays neutral because a tone ring would state severity a
              third time.
            */}
            <View className={cn("absolute bottom-3 left-3 top-3 w-1 rounded-full", tone.bar)} />
            {/*
              `items-center` for the one- and two-line cases alike: 66 of the
              app's 90 toasts are title-only, so one line is the common case.
            */}
            <View className="flex-row items-center gap-3 pl-7 pr-3">
              <Icon name={tone.icon} className={cn("size-5", tone.ink)} />
              <View className="flex-1 gap-1">
                <CardTitle>{toast.title}</CardTitle>
                {toast.description ? <CardDescription>{toast.description}</CardDescription> : null}
              </View>
              {/*
                The toast's only dismissal. It calls `dismissToast` - the SAME
                transition the timer fires - so promotion is one code path, and
                it does not clear the queue.

                ☠️ `focusable` is deliberately never set here: on RNW `focusable`
                IS `tabIndex`, and binding it to a pending flag drops focus
                mid-action (#1049).
              */}
              <Pressable
                accessibilityLabel={t("toast.dismiss")}
                accessibilityRole="button"
                className="size-9 items-center justify-center rounded-full active:bg-accent/40"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={dismissToast}
                role="button"
              >
                <Icon name="close" className="size-5 text-muted-foreground" />
              </Pressable>
            </View>
          </Card>
        </NativeOnlyAnimatedView>
      </View>
    </View>
  );
}
