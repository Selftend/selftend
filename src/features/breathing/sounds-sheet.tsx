import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { AMBIENT_SOUNDS, BREATH_SOUNDS } from "@/src/constants/breathing-sounds";
import { mergeUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface SoundsSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

// Sound *selection* only — volume is handled by the always-visible sliders on the session screen.
export function SoundsSheet({ visible, onDismiss }: SoundsSheetProps) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: prefs } = useUserPreferences(userId);
  const updateMutation = useUpdateUserPreferences(userId);
  const [openPicker, setOpenPicker] = useState<"breath" | "ambient" | null>(null);

  const effective = mergeUserPreferences(prefs, {});

  const patch = (p: Partial<UserPreferences>) => {
    if (!userId) return;
    void updateMutation.mutateAsync(mergeUserPreferences(prefs, p));
  };

  const breathSound =
    BREATH_SOUNDS.find((s) => s.id === effective.breathSoundId) ?? BREATH_SOUNDS[0];
  const ambientSound =
    AMBIENT_SOUNDS.find((s) => s.id === effective.ambientSoundId) ?? AMBIENT_SOUNDS[0];

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onDismiss} transparent>
      <View className="flex-1 justify-end bg-black/40">
        <SafeAreaView edges={["bottom"]} className="rounded-t-2xl bg-background">
          <ScrollView contentContainerClassName="gap-6 p-6">
            <View className="flex-row items-center justify-between">
              <Text variant="h2">{t("breathing.sounds.title")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("breathing.sounds.close")}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={onDismiss}
              >
                <Icon name="close" className="size-6 text-muted-foreground" />
              </Pressable>
            </View>

            <Lane
              label={t("breathing.sounds.breathLabel")}
              soundName={t(breathSound.labelKey)}
              onPress={() => setOpenPicker(openPicker === "breath" ? null : "breath")}
              pickLabel={t("breathing.sounds.pickBreath")}
            />
            {openPicker === "breath" ? (
              <Picker
                items={BREATH_SOUNDS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
                selectedId={effective.breathSoundId}
                onSelect={(id) => patch({ breathSoundId: id })}
              />
            ) : null}

            <Lane
              label={t("breathing.sounds.ambientLabel")}
              soundName={t(ambientSound.labelKey)}
              onPress={() => setOpenPicker(openPicker === "ambient" ? null : "ambient")}
              pickLabel={t("breathing.sounds.pickAmbient")}
            />
            {openPicker === "ambient" ? (
              <Picker
                items={AMBIENT_SOUNDS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
                selectedId={effective.ambientSoundId}
                onSelect={(id) => patch({ ambientSoundId: id })}
              />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

interface LaneProps {
  label: string;
  soundName: string;
  onPress: () => void;
  pickLabel: string;
}

function Lane({ label, soundName, onPress, pickLabel }: LaneProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pickLabel}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl border border-border p-3"
    >
      <View>
        <Text className="text-sm font-semibold">{label}</Text>
        <Text variant="muted" className="text-xs">
          {soundName}
        </Text>
      </View>
      <Icon name="chevron-right" className="size-5 text-muted-foreground" />
    </Pressable>
  );
}

interface PickerProps {
  items: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function Picker({ items, selectedId, onSelect }: PickerProps) {
  return (
    <View className="gap-1 rounded-xl border border-border p-2">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => onSelect(item.id)}
            className={cn(
              "flex-row items-center justify-between rounded-lg px-3 py-2",
              active ? "bg-aqua/10" : "bg-transparent",
            )}
          >
            <Text className={cn("text-sm", active && "font-semibold text-aqua")}>{item.label}</Text>
            {active ? <Icon name="check" className="size-4 text-aqua" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
