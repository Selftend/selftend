import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { formatCompactAtOffset } from "@/src/utils/date";
import { cn } from "@/lib/utils";
import { useDeleteEmotionRecord, useEmotionRecord } from "@/src/features/dbt/queries";
import { seedThoughtRecord } from "@/src/stores/thought-record-seed-store";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/emotions/[id]` - one record, read back (spec §3.3.1).
 *
 * **The detail's one door is _Look at the whole picture_**, which opens a CBT
 * thought record seeded with this record's emotions and its situation. The seed
 * travels through the in-memory store, never a route parameter: Expo Router
 * serialises params into the web address bar, and a person's emotions in a URL
 * is health data on the navigation path (#739).
 *
 * ⚠️ Only the check-in's BUILT-IN emotion ids cross. A custom emotion is the
 * person's own word for something and has no counterpart in the thought
 * record's fixed list, which is the check-in's own shipped rule for this
 * hand-off rather than a new one.
 *
 * Nothing here is editable. A record is what was true when it was written, and
 * the module has no edit path for any of its five records - only delete.
 */
export default function DbtEmotionRecordDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation("dbt");
  const { user } = useSession();
  const pushWithOrigin = usePushWithOrigin();
  const showToast = useToastStore((state) => state.showToast);
  const { data: record, isPending } = useEmotionRecord(user?.id ?? null, id);
  const deleteMutation = useDeleteEmotionRecord(user?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remove = useSingleFlight(async () => {
    try {
      await deleteMutation.mutateAsync(id);
      router.replace("/modules/dbt/emotions");
    } catch {
      showToast({ title: t("emotions.deleteError"), tone: "error" });
    }
  });

  if (isPending) return <ScreenLoading title={t("tools.emotions.name")} />;

  if (!record) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className={cn(FORM_COLUMN, "gap-6")}>
            <ScreenHeader title={t("tools.emotions.name")} />
            <Text variant="muted">{t("emotions.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const builtInIds = new Set(DEFAULT_EMOTIONS.map((emotion) => emotion.id));
  const sections: { key: string; value: string }[] = [
    { key: "whatHappened", value: record.whatHappened },
    { key: "meaning", value: record.meaning },
    { key: "urges", value: record.urges },
    { key: "didAndSaid", value: record.didAndSaid },
    { key: "afterwards", value: record.afterwards },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ConfirmDialog
        visible={confirmDelete}
        isPending={deleteMutation.isPending}
        title={t("emotions.deleteTitle")}
        message={t("emotions.deleteBody")}
        confirmLabel={t("emotions.deleteConfirm")}
        cancelLabel={t("emotions.deleteCancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void remove();
        }}
      />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-7")}>
          <View className="gap-2">
            <ScreenHeader title={t("tools.emotions.name")} />
            {/* The record's own captured frame, not the reader's. */}
            <Text variant="muted">
              {formatCompactAtOffset(record.createdAt, record.createdOffsetMinutes)}
            </Text>
          </View>

          <EmotionRun
            label={t("emotions.primaryLabel")}
            ids={record.primaryEmotions}
            empty={t("emotions.noneChosen")}
          />
          {record.secondaryEmotions.length > 0 ? (
            <EmotionRun label={t("emotions.secondaryLabel")} ids={record.secondaryEmotions} />
          ) : null}
          {record.bodySensations ? (
            <Field label={t("emotions.bodyLabel")} value={record.bodySensations} />
          ) : null}

          {sections
            .filter((section) => section.value.trim().length > 0)
            .map((section) => (
              <Field
                key={section.key}
                label={t(`emotions.parts.${section.key}`)}
                value={section.value}
              />
            ))}

          <View className="gap-3">
            <Button
              variant="outline"
              onPress={() => {
                // Built-in ids only; a custom emotion has no counterpart in the
                // thought record's fixed list.
                seedThoughtRecord(
                  [...record.primaryEmotions, ...record.secondaryEmotions].filter((emotionId) =>
                    builtInIds.has(emotionId),
                  ),
                  record.whatHappened,
                );
                // `push`, never `replace`: the person should be able to come
                // back to the record they were reading.
                pushWithOrigin("/modules/cbt/new");
              }}
            >
              <Icon name="article" className="size-4" />
              <Text>{t("emotions.wholePicture")}</Text>
            </Button>

            <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
              <Text className="text-destructive">{t("emotions.delete")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1.5">
      <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
        {label}
      </Text>
      <Text className="text-[15px] leading-relaxed">{value}</Text>
    </View>
  );
}

function EmotionRun({ label, ids, empty }: { label: string; ids: string[]; empty?: string }) {
  const { t: tCbt } = useTranslation("cbt");
  return (
    <View className="gap-1.5">
      <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
        {label}
      </Text>
      {ids.length === 0 ? (
        empty ? (
          <Text variant="muted">{empty}</Text>
        ) : null
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {ids.map((id) => (
            <View key={id} className="rounded-full border border-border bg-card px-2.5 py-1">
              {/* A custom emotion has no translation, so its own word is the
                  label - the check-in's shipped fallback. */}
              <Text className="text-xs font-medium">
                {tCbt(`emotions.${id.toLowerCase()}`, id)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
