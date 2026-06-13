import { router } from "expo-router";
import { memo, useCallback } from "react";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import type { MeditationSession } from "@/src/features/meditation/types";
import { useSession } from "@/src/providers/session-provider";

// Memoized row so the FlatList only re-renders changed items, and navigation stays
// keyed to the session id (#97 — was a .map() inside a ScrollView, all 100 rows mounted).
const SessionRow = memo(function SessionRow({ session }: { session: MeditationSession }) {
  const { t } = useTranslation("meditation");
  const onPress = useCallback(
    () => router.push({ pathname: "/tools/meditation/sessions/[id]", params: { id: session.id } }),
    [session.id],
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="rounded-lg border border-border bg-card p-3 active:bg-accent/40"
    >
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text className="font-semibold">
            {t("module.sessions.durationLabel", { count: session.durationMinutes })}
          </Text>
          <Text variant="muted" className="text-xs">
            {new Date(session.completedAt).toLocaleString()}
          </Text>
        </View>
        <View className="rounded-full bg-primary/10 px-2 py-0.5">
          <Text className="text-xs font-semibold text-primary">
            {t("module.sessions.stageBadge", { stage: session.stageAtSession })}
          </Text>
        </View>
      </View>
      {session.reflection ? (
        <Text variant="muted" className="mt-2 text-sm" numberOfLines={2}>
          {session.reflection}
        </Text>
      ) : null}
    </Pressable>
  );
});

export default function MeditationSessionsScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const { data: sessions } = useMeditationSessions(user?.id ?? null, 100);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SessionRow session={item} />}
        // FlatList is the scroll root so off-screen rows recycle. NativeWind does not
        // cssInterop contentContainerClassName here, so style the content directly.
        contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 8 }}
        ListHeaderComponent={
          <View className="mb-6 gap-2">
            <ScreenHeader title={t("module.sessions.title")} />
            <Text variant="muted">{t("module.sessions.subtitle")}</Text>
          </View>
        }
        ListEmptyComponent={<Text variant="muted">{t("module.sessions.empty")}</Text>}
      />
    </SafeAreaView>
  );
}
