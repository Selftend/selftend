import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { ErrorState, LoadingState } from "@/src/components/app/screen-state";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { BeforeAfterPair } from "@/src/features/cbt/before-after-pair";
import { useThoughtRecord } from "@/src/features/cbt/queries";
import { resolveHotThought } from "@/src/features/cbt/thought-record-form";
import { useSession } from "@/src/providers/session-provider";

// The calm completion screen shown after a NEW thought record is saved (never for
// edits - see app/(app)/modules/cbt/new.tsx onSaved). Intentionally quiet: no
// streaks, no confetti - just an acknowledgement and the numbers, if any.
//
// The BELIEF pair leads (#1381): the hot thought's rating before against the
// record-level re-rating after - the same pair the detail screen and the module
// home's stat read, so this screen stops disagreeing with both. The emotion
// intensity pair stays underneath it when both of its values exist; either pair
// is OMITTED, never dashed, when a number is missing.
export default function ThoughtRecordSavedScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === "string" ? id : null;
  const { user } = useSession();
  const { data, isLoading } = useThoughtRecord(user?.id ?? null, recordId);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.loading")} description={t("detail.loadingDescription")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("detail.notFound")} />
            <ErrorState
              title={t("detail.notFoundLabel")}
              description={t("detail.notFoundDescription")}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // The belief-before is the hot thought's own rating: nats travel encrypted
  // and are decrypted by the record query, so the pair is assembled here, not
  // read off a column.
  const beliefBefore = resolveHotThought(data.nats)?.beliefRating ?? null;
  const showBelief =
    beliefBefore !== null && data.beliefAfter !== null && data.beliefAfter !== undefined;
  const showIntensity =
    data.emotionIntensityBefore !== null &&
    data.emotionIntensityBefore !== undefined &&
    data.emotionIntensityAfter !== null &&
    data.emotionIntensityAfter !== undefined;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-10 p-6">
        <View className="items-center gap-2">
          <Text variant="h2" className="text-center">
            {t("saved.title")}
          </Text>
        </View>

        {showBelief ? (
          <BeforeAfterPair
            beforeLabel={t("saved.beliefBefore")}
            beforeValue={beliefBefore}
            afterLabel={t("saved.beliefAfter")}
            afterValue={data.beliefAfter}
          />
        ) : null}

        {showIntensity ? (
          <BeforeAfterPair
            beforeLabel={t("saved.intensityBefore")}
            beforeValue={data.emotionIntensityBefore}
            afterLabel={t("saved.intensityAfter")}
            afterValue={data.emotionIntensityAfter}
          />
        ) : null}

        <View className="gap-3">
          <Button
            onPress={() =>
              router.replace(
                `/modules/cbt/history/${recordId}` as Parameters<typeof router.replace>[0],
              )
            }
          >
            <Text>{t("saved.viewRecord")}</Text>
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.replace("/(app)" as Parameters<typeof router.replace>[0])}
          >
            <Text>{t("saved.backHome")}</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
