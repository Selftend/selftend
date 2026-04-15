import { router } from "expo-router";
import { Text, View } from "react-native";

import { EmptyState } from "@/src/components/empty-state";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { SectionLinkCard } from "@/src/components/section-link-card";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function HomeScreen() {
  const { user } = useSession();
  const { data } = useThoughtRecords(user?.id ?? null);
  const latestRecord = data?.[0];

  return (
    <Screen
      subtitle="The app starts with a single complete CBT section. Other modules stay out of the way until they are justified."
      title="A calm starting point"
    >
      <NoticeCard
        body="This product is for guided self-help and reflection. It is not diagnosis, therapy, or emergency support."
        title="Scope boundary"
      />

      <SectionLinkCard
        description="Start a guided thought record, review distortions, and keep one private history."
        icon="leaf-outline"
        onPress={() => router.push("/cbt")}
        title="CBT section"
      />
      <SectionLinkCard
        description="Review saved records, keep context, and revisit balanced thoughts without pressure."
        icon="time-outline"
        onPress={() => router.push("/(app)/(tabs)/history")}
        title="Thought history"
      />
      <SectionLinkCard
        description="Quiet reminders, support links, and legal boundaries live here."
        icon="compass-outline"
        onPress={() => router.push("/(app)/(tabs)/settings")}
        title="Settings and support"
      />

      <View className="gap-2">
        <Text className="text-lg font-semibold text-ink">Recent activity</Text>
        {latestRecord ? (
          <View className="rounded-3xl bg-white p-5">
            <Text className="text-sm uppercase tracking-wide text-ink/50">Last updated</Text>
            <Text className="mt-1 text-base font-semibold text-ink">{formatTimestamp(latestRecord.updatedAt)}</Text>
            <Text className="mt-3 text-sm leading-6 text-ink/70" numberOfLines={3}>
              {latestRecord.automaticThought}
            </Text>
          </View>
        ) : (
          <EmptyState
            body="Once you save a record, the latest one will surface here."
            title="No records yet"
          />
        )}
      </View>
    </Screen>
  );
}
