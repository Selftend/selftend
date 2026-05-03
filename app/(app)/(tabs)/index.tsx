import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function HomeScreen() {
  const { user } = useSession();
  const { data } = useThoughtRecords(user?.id ?? null);
  const latestRecord = data?.[0];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">A calm starting point</Text>
            <Text variant="muted">
              The app starts with a single complete CBT section. Other modules stay out of the way until they are
              justified.
            </Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>Scope boundary</CardTitle>
              <CardDescription>
                This product is for guided self-help and reflection. It is not diagnosis, therapy, or emergency support.
              </CardDescription>
            </CardHeader>
          </Card>

          <Pressable onPress={() => router.push("/cbt")}>
            <Card>
              <CardHeader>
                <CardTitle>CBT section</CardTitle>
                <CardDescription>
                  Start a guided thought record, review distortions, and keep one private history.
                </CardDescription>
              </CardHeader>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/(app)/(tabs)/history")}>
            <Card>
              <CardHeader>
                <CardTitle>Thought history</CardTitle>
                <CardDescription>
                  Review saved records, keep context, and revisit balanced thoughts without pressure.
                </CardDescription>
              </CardHeader>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/(app)/(tabs)/settings")}>
            <Card>
              <CardHeader>
                <CardTitle>Settings and support</CardTitle>
                <CardDescription>Quiet reminders, support links, and legal boundaries live here.</CardDescription>
              </CardHeader>
            </Card>
          </Pressable>

          <View className="gap-2">
            <Text variant="h3">Recent activity</Text>
            {latestRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle>Last updated {formatTimestamp(latestRecord.updatedAt)}</CardTitle>
                  <CardDescription>{latestRecord.automaticThought}</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No records yet</CardTitle>
                  <CardDescription>Once you save a record, the latest one will surface here.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
