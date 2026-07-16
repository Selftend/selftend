import { useState } from "react";
import { usePathname } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Fab } from "@/src/components/app/fab";
import { ContinueRoutineSheet } from "@/src/features/routines/continue-routine-sheet";
import { useRoutinesToday } from "@/src/features/routines/use-routines-today";
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

// The floating routine-progress handle (spec #37 Home integration, #50).
// Conditional by construction: the button renders only while at least one
// routine step is still open today - hidden at zero routines and once all are
// done - and shows the aggregate N/M for the day. It sits in the bottom-RIGHT
// corner so it can never collide with the bottom-CENTER one-time reminder
// prompt card: coexistence by placement, no suppression, no arbitration. The
// sheet stays mounted independently of the button so completing the last step
// while it is open flips it to the gentle completion state instead of
// yanking it away.
export function RoutineFab() {
  const { t } = useTranslation("routines");
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const today = useRoutinesToday(userId);
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!userId) return null;

  const showButton = !today.isLoading && today.openSteps > 0 && !isDataEntryPath(pathname);

  return (
    <>
      {showButton ? (
        <View
          pointerEvents="box-none"
          className="absolute right-4 z-[60]"
          style={{ bottom: insets.bottom + 16 }}
        >
          <Fab
            icon="repeat"
            label={t("fab.progress", { done: today.doneSteps, total: today.totalSteps })}
            accessibilityLabel={t("fab.a11y", {
              done: today.doneSteps,
              total: today.totalSteps,
            })}
            onPress={() => setSheetOpen(true)}
            testID="routine-fab"
          />
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
