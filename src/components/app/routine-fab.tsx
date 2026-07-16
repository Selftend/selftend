import { useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import { Animated, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Fab } from "@/src/components/app/fab";
import { Text } from "@/src/components/react-native-reusables/text";
import { ContinueRoutineSheet } from "@/src/features/routines/continue-routine-sheet";
import { firstOpenRoutineView, useRoutinesToday } from "@/src/features/routines/use-routines-today";
import {
  announceMessage,
  politeLiveRegionProps,
  useReduceMotionEnabled,
} from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

// Invariant (#90): the FAB never renders over data-entry screens. Its job is
// nudging from browsing contexts; on form screens it sat on top of
// MobileFormScreen's sticky footer (e.g. the mood editor's Save button). The
// route set below mirrors every (app) route that renders MobileFormScreen (or
// another Save-button entry surface):
// - creation/edit/log forms all share the /new, /edit and /log path suffixes;
// - the remaining forms live at fixed paths, or under fixed prefixes where the
//   form sits behind a dynamic segment (their sibling index/browsing routes
//   have no trailing slash, so the prefixes below cannot match them).
// When adding a form route that matches none of these, extend this list.
const FORM_ROUTE_SUFFIXES = ["/new", "/edit", "/log"];
const FORM_ROUTE_PATHS = [
  "/support",
  "/modules/cbt/recovery",
  "/modules/cbt/values",
  "/modules/cbt/self-care",
  "/modules/act/expansion/urge-surfing",
  "/tools/meditation/daily-life",
];
const FORM_ROUTE_PREFIXES = [
  "/modules/act/values/", // [domain] rating editor + the bulls-eye check-in
  "/modules/act/committed-action/", // [id] progress editor
];

export function isDataEntryPath(pathname: string): boolean {
  return (
    FORM_ROUTE_SUFFIXES.some((suffix) => pathname.endsWith(suffix)) ||
    FORM_ROUTE_PATHS.includes(pathname) ||
    FORM_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

// How long the completed checkmark holds before fading (#91): long enough to
// register as an acknowledgment, short enough to leave no residue.
const COMPLETED_HOLD_MS = 2500;
const COMPLETED_FADE_MS = 400;

// The floating routine-progress handle (spec #37 Home integration, #50, #91).
// Conditional by construction: the button renders only while at least one
// routine step is still open today - hidden at zero routines and once all are
// done. Visibility is aggregate (any open step anywhere), but the N/M it
// shows is the FIRST OPEN routine's count - exactly the routine the
// continue sheet opens pinned (firstOpenRoutineView, shared with the sheet),
// not the cross-routine total, which read as noise (#91). It sits in the
// bottom-RIGHT corner so it can never collide with the bottom-CENTER one-time
// reminder prompt card: coexistence by placement, no suppression, no
// arbitration. The sheet stays mounted independently of the button so
// completing the last step while it is open flips it to the gentle completion
// state instead of yanking it away.
//
// Completed state (#91): when the button is on screen and the open-step count
// hits zero, it morphs to a checkmark, holds briefly, then fades out - a
// vanish-on-done felt like a glitch in the field. The fade plays only on that
// live transition: a fresh render with everything already done shows nothing,
// and once faded it stays gone until steps open again (next day, new
// routine).
export function RoutineFab() {
  const { t } = useTranslation("routines");
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const today = useRoutinesToday(userId);
  const pathname = usePathname();
  const reduceMotion = useReduceMotionEnabled();
  const [sheetOpen, setSheetOpen] = useState(false);

  const [showCompleted, setShowCompleted] = useState(false);
  const completedOpacity = useRef(new Animated.Value(1)).current;
  // Whether the PREVIOUS render showed the counting button - the completed
  // state plays only on a live visible->done transition, never on mount.
  const wasCountVisibleRef = useRef(false);

  const firstOpen = firstOpenRoutineView(today.views);
  const showCount =
    !today.isLoading && today.openSteps > 0 && firstOpen !== null && !isDataEntryPath(pathname);

  // Detect the live transition to zero open steps while the button was
  // visible; only then arm the completed state.
  useEffect(() => {
    const wasVisible = wasCountVisibleRef.current;
    wasCountVisibleRef.current = showCount;
    if (showCount) {
      // Steps (re)opened - any lingering completed state yields to the count.
      setShowCompleted(false);
      return;
    }
    if (wasVisible && !today.isLoading && today.openSteps === 0) {
      completedOpacity.setValue(1);
      setShowCompleted(true);
      announceMessage(t("fab.complete"));
    }
  }, [showCount, today.isLoading, today.openSteps, completedOpacity, t]);

  // Hold the checkmark, then fade it out (instantly under reduced motion).
  useEffect(() => {
    if (!showCompleted) return;
    const hold = setTimeout(() => {
      if (reduceMotion) {
        setShowCompleted(false);
        return;
      }
      Animated.timing(completedOpacity, {
        toValue: 0,
        duration: COMPLETED_FADE_MS,
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (finished) setShowCompleted(false);
      });
    }, COMPLETED_HOLD_MS);
    return () => clearTimeout(hold);
  }, [showCompleted, reduceMotion, completedOpacity]);

  if (!userId) return null;

  return (
    <>
      {showCount && firstOpen ? (
        <View
          pointerEvents="box-none"
          className="absolute right-4 z-[60]"
          style={{ bottom: insets.bottom + 16 }}
        >
          <Fab
            icon="repeat"
            label={t("fab.progress", {
              done: firstOpen.day.doneCount,
              total: firstOpen.day.totalCount,
            })}
            accessibilityLabel={t("fab.a11y", {
              name: firstOpen.routine.name,
              done: firstOpen.day.doneCount,
              total: firstOpen.day.totalCount,
            })}
            onPress={() => setSheetOpen(true)}
            testID="routine-fab"
          />
        </View>
      ) : showCompleted && !isDataEntryPath(pathname) ? (
        <View
          pointerEvents="box-none"
          className="absolute right-4 z-[60]"
          style={{ bottom: insets.bottom + 16 }}
        >
          <Animated.View style={{ opacity: completedOpacity }}>
            <Fab
              icon="check"
              accessibilityLabel={t("fab.complete")}
              onPress={() => setSheetOpen(true)}
              testID="routine-fab-complete"
            />
          </Animated.View>
          {Platform.OS === "web" ? (
            // announceMessage is a no-op on web; a hidden polite live region
            // makes the completion audible there (preview-section pattern).
            <Text className="sr-only" {...politeLiveRegionProps()}>
              {t("fab.complete")}
            </Text>
          ) : null}
        </View>
      ) : null}
      <ContinueRoutineSheet
        userId={userId}
        views={today.views}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
