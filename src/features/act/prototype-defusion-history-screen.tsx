/**
 * PROTOTYPE ONLY - throwaway (#1515). Do not merge to `dev`.
 *
 * The archive behind variants B and C's door, drawn on the template #1514
 * chose: `GroundingHistoryScreen`'s flat, newest-first FlatList. Flat and
 * newest-first is #1513's binding, so this screen is the SAME in B and C and
 * is not itself what the owner is choosing between - it is here so the door
 * leads somewhere real when you tap it.
 *
 * Reads `useDefusionLogs(userId, 50)` rather than a paged query on purpose:
 * how far it reaches is #1516.
 */
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import { DefusionLogRow } from "@/src/features/act/defusion-log-row";
import { useDefusionLogs } from "@/src/features/act/queries";
import type { DefusionLog } from "@/src/features/act/types";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useSession } from "@/src/providers/session-provider";

export default function PrototypeDefusionHistoryScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data, isPending } = useDefusionLogs(user?.id ?? null, 50);
  const logs = data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<DefusionLog>
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          width: "100%",
          maxWidth: FORM_COLUMN_WIDTH,
          alignSelf: "center",
        }}
        ListHeaderComponent={
          <View className="mb-2 gap-2">
            <ScreenHeader title="All defusion logs" />
            <Text variant="muted">Every thought you have unhooked from, newest first.</Text>
          </View>
        }
        ListEmptyComponent={
          isPending ? null : (
            <EmptyState
              icon="history"
              title="No logs yet"
              description="Defusion logs you save will show up here."
            />
          )
        }
        renderItem={({ item }) => (
          <DefusionLogRow
            log={item}
            onPress={() =>
              pushWithOrigin({ pathname: "/modules/act/defusion/[id]", params: { id: item.id } })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
