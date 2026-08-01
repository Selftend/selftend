import { router } from "expo-router";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { useSaveChoicePoint } from "@/src/features/act/queries";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";

function StringArrayEditor({
  label,
  hint,
  items,
  onAdd,
  onRemove,
  addLabel,
}: {
  label: string;
  hint: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  addLabel: string;
}) {
  const { t } = useTranslation("act");
  const [inputValue, setInputValue] = useState("");

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInputValue("");
  }

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Label>{label}</Label>
        <Text variant="muted" className="text-xs">
          {hint}
        </Text>
      </View>

      {items.length > 0 ? (
        <View className="gap-2">
          {items.map((item, index) => (
            <View
              key={index}
              className="flex-row items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
            >
              <Text className="flex-1 text-sm">{item}</Text>
              <Pressable
                accessibilityLabel={t("choicePoint.removeItem", { item })}
                accessibilityRole="button"
                onPress={() => onRemove(index)}
              >
                <Icon name="close" className="size-4 text-muted-foreground" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
        <TextInput
          className="flex-1 py-3 text-sm text-foreground"
          accessibilityLabel={label}
          placeholderTextColor="gray"
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={handleAdd}
          disabled={!inputValue.trim()}
        >
          <Icon
            name="add-circle"
            className={inputValue.trim() ? "size-6 text-primary" : "size-6 text-muted-foreground"}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function ActChoicePointNewScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveChoicePoint(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [hooks, setHooks] = useState<string[]>([]);
  const [awayMoves, setAwayMoves] = useState<string[]>([]);
  const [towardMoves, setTowardMoves] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  function addToArray(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (value: string) => setter((prev) => [...prev, value]);
  }

  function removeFromArray(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (index: number) => setter((prev) => prev.filter((_, i) => i !== index));
  }

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    setSubmitError("");
    try {
      await saveMutation.mutateAsync({
        hooks,
        awayMoves,
        towardMoves,
        notes: notes.trim(),
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:choicePoint.save");
      setSubmitError(message);
    }
  });

  return (
    <MobileFormScreen
      footer={
        <Button disabled={saveMutation.isPending} onPress={() => void handleSave()}>
          {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{t("act:choicePoint.save")}</Text>
        </Button>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("act:choicePoint.title")} />
          <Text variant="muted">{t("act:choicePoint.primer")}</Text>
        </View>

        <CrisisSupportBar />

        {/*
          `bg-card`, not `bg-destructive/10`. Red text on a wash of its own red
          is always tighter than the same text on the bare surface, and here it
          measured 4.03:1 — below AA — on the default palette (#603). The border
          and the text keep the error read; only the surface underneath them is
          neutral, where `text-destructive` is held at or above 4.5 on all eight
          palettes by the per-style audit.
        */}
        {submitError ? (
          <View className="rounded-lg border border-destructive bg-card p-3">
            <Text className="text-sm text-destructive">{submitError}</Text>
          </View>
        ) : null}

        <StringArrayEditor
          label={t("act:choicePoint.hooksLabel")}
          hint={t("act:choicePoint.hooksHint")}
          items={hooks}
          onAdd={addToArray(setHooks)}
          onRemove={removeFromArray(setHooks)}
          addLabel={t("act:choicePoint.addItem")}
        />

        <StringArrayEditor
          label={t("act:choicePoint.awayLabel")}
          hint={t("act:choicePoint.awayHint")}
          items={awayMoves}
          onAdd={addToArray(setAwayMoves)}
          onRemove={removeFromArray(setAwayMoves)}
          addLabel={t("act:choicePoint.addItem")}
        />

        <StringArrayEditor
          label={t("act:choicePoint.towardLabel")}
          hint={t("act:choicePoint.towardHint")}
          items={towardMoves}
          onAdd={addToArray(setTowardMoves)}
          onRemove={removeFromArray(setTowardMoves)}
          addLabel={t("act:choicePoint.addItem")}
        />

        <View className="gap-3">
          <View className="gap-1">
            <Label>{t("act:choicePoint.notesLabel")}</Label>
          </View>
          <Textarea
            accessibilityLabel={t("act:choicePoint.notesLabel")}
            onChangeText={setNotes}
            value={notes}
          />
        </View>
      </View>
    </MobileFormScreen>
  );
}
