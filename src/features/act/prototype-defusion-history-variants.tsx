/**
 * PROTOTYPE ONLY - throwaway (#1515). Do not merge to `dev`.
 *
 * Three variants of the defusion surface, switchable via `?variant=` on the
 * real `/modules/act/defusion` route. Defusion is the stand-in for all five
 * today-only ACT lists; whatever wins here applies to expansion, connection,
 * observing self and choice points as a set.
 *
 * The question is NOT how the archive list is built - #1513 already binds it
 * to flat + newest-first, and #1514 put it on the grounding/breathing template.
 * The question is WHERE the archive lives and WHAT sits in front of it, given
 * that ACT's list screen is the tool's LANDING screen (ACT home's tool grid
 * routes straight to `/modules/act/<tool>`), not a door behind a recent block
 * the way grounding, mood and sleep are built.
 *
 * Deliberately NOT wired to real paging: it reads `useDefusionLogs(userId, 50)`
 * so no query key or repository changes are needed. How far the list actually
 * reaches is #1516's question, not this one. Copy is hardcoded English - this
 * never merges, so it never earns i18n keys.
 */
import { Fragment } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { ACT_SHARED_TOOLS } from "@/src/features/act/act-shared-tools";
import { DefusionLogRow } from "@/src/features/act/defusion-log-row";
import type { DefusionLog } from "@/src/features/act/types";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export const VARIANT_NAMES = {
  A: "Landing IS the archive",
  B: "Recent block, door to archive",
  C: "Today block, door to archive",
};

/** The bits every variant keeps: what makes this screen the tool's landing. */
function LandingHeader({ onNew }: { onNew: () => void }) {
  return (
    <View className="gap-6">
      <View className="gap-2">
        <ScreenHeader title="Defusion logs" />
        <Text variant="muted">A record of the thoughts you have unhooked from.</Text>
      </View>

      <Button onPress={onNew}>
        <Icon name="add" className="size-4 text-primary-foreground" />
        <Text>New defusion log</Text>
      </Button>

      <SharedToolsRow heading="Also try" tools={[ACT_SHARED_TOOLS.journal]} />
    </View>
  );
}

function LogList({ logs, onOpen }: { logs: DefusionLog[]; onOpen: (id: string) => void }) {
  return (
    <View>
      {logs.map((log) => (
        <DefusionLogRow key={log.id} log={log} onPress={() => onOpen(log.id)} />
      ))}
    </View>
  );
}

/**
 * VARIANT A - the landing screen becomes the archive.
 *
 * Drops the day filter outright. One route, no new screens, and ACT home's
 * "Show all logs" door starts telling the truth by itself. The cost is on
 * screen: arriving at Defusion to DO defusion lands you at the top of your
 * own archive, and the tool's identity shifts from "the place I practise" to
 * "the place I read back".
 */
export function VariantA({ logs, onNew, onOpen }: VariantProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <LandingHeader onNew={onNew} />
          {logs.length === 0 ? (
            <Text variant="muted">No entries yet.</Text>
          ) : (
            <LogList logs={logs} onOpen={onOpen} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * VARIANT B - landing stays a landing; the archive moves behind a door.
 *
 * This is the shape grounding, mood and sleep already ship: a bounded recent
 * block on the tool's own screen, a `ShowAllLink` to a bare paged history
 * route. The block is cross-day, so a user who logged nothing today still
 * sees their last five. The cost is five new routes, five new screens and
 * four i18n blocks each across two locales.
 */
export function VariantB({ logs, onNew, onOpen, onShowAll }: VariantProps) {
  const recent = logs.slice(0, 5);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <LandingHeader onNew={onNew} />

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold">Recent</Text>
              {logs.length > recent.length ? (
                <ShowAllLink label="Show all logs" route={onShowAll} />
              ) : null}
            </View>
            {recent.length === 0 ? (
              <Text variant="muted">No entries yet.</Text>
            ) : (
              <LogList logs={recent} onOpen={onOpen} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * VARIANT C - what #1332 sketched: today's section kept, with a door to the rest.
 *
 * The only variant where a civil day stays a first-class unit on screen, so it
 * is the only one that preserves ACT's daily-practice framing. It stays inside
 * #1513's invariant - `toLocalDateKey` is the same device-timezone frame every
 * other ACT day-namer uses - but it is the shape most in tension with #1514's
 * "flat and newest-first", and it is the one that still shows an empty screen
 * to someone who has logged plenty, just not today.
 */
export function VariantC({ logs, onNew, onOpen, onShowAll }: VariantProps) {
  const { selectedDate } = useSelectedDate();
  const today = logs.filter((log) => toLocalDateKey(log.createdAt) === selectedDate);
  const earlier = logs.filter((log) => toLocalDateKey(log.createdAt) !== selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <LandingHeader onNew={onNew} />

          <View className="gap-2">
            <Text className="font-semibold">Today</Text>
            {today.length === 0 ? (
              <Text variant="muted">Nothing logged today.</Text>
            ) : (
              <LogList logs={today} onOpen={onOpen} />
            )}
          </View>

          {earlier.length > 0 ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold">Earlier</Text>
                <ShowAllLink label="Show all logs" route={onShowAll} />
              </View>
              <LogList logs={earlier.slice(0, 3)} onOpen={onOpen} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export interface VariantProps {
  logs: DefusionLog[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onShowAll: "/modules/act/defusion/history";
}

/** Convenience for the route file. */
export function useDefusionNav() {
  const pushWithOrigin = usePushWithOrigin();
  return {
    onNew: () => pushWithOrigin("/modules/act/defusion/new"),
    onOpen: (id: string) =>
      pushWithOrigin({ pathname: "/modules/act/defusion/[id]", params: { id } }),
  };
}

export const Noop = Fragment;
