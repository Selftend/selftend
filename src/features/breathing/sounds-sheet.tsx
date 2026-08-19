import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { AMBIENT_SOUNDS, BREATH_SOUNDS } from "@/src/constants/breathing-sounds";
import { mergeUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";

interface SoundsSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

// Sound *selection* only - volume is handled by the always-visible sliders on the session screen.
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
    // Best-effort persistence of the sound selection; a failed write must not become an
    // unhandled rejection (the local selection is applied immediately regardless).
    void updateMutation.mutateAsync(p).catch(() => undefined);
  };

  const breathSound =
    BREATH_SOUNDS.find((s) => s.id === effective.breathSoundId) ?? BREATH_SOUNDS[0];
  const ambientSound =
    AMBIENT_SOUNDS.find((s) => s.id === effective.ambientSoundId) ?? AMBIENT_SOUNDS[0];

  return (
    <PressShieldModal visible={visible} onRequestClose={onDismiss} transparent>
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
                label={t("breathing.sounds.breathLabel")}
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
                label={t("breathing.sounds.ambientLabel")}
                items={AMBIENT_SOUNDS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
                selectedId={effective.ambientSoundId}
                onSelect={(id) => patch({ ambientSoundId: id })}
              />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </PressShieldModal>
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
  label: string;
  items: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function Picker({ label, items, selectedId, onSelect }: PickerProps) {
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const roving = useRovingFocus({
    count: items.length,
    // No selection: treat the first item as active so the group stays tab-reachable.
    activeIndex: selectedIndex < 0 ? 0 : selectedIndex,
    onActivate: (index) => onSelect(items[index].id),
  });

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      className="gap-1 rounded-xl border border-border p-2"
      role="radiogroup"
    >
      {items.map((item, index) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            aria-checked={active}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            role="radio"
            onPress={() => onSelect(item.id)}
            {...roving.getItemProps(index, () => onSelect(item.id))}
            className={cn(
              "flex-row items-center justify-between rounded-lg px-3 py-2",
              active ? "bg-muted" : "bg-transparent",
            )}
          >
            {/*
              Hue-keyed ink, not the accent (#412): the selected row is 14px
              text on `bg-aqua/10`, where the published accent reads 4.27:1.
              `text-aqua-ink` rather than `text-primary-ink` because this sheet
              renders in a <Modal> - the aqua pour from the session route below
              it is not something to rely on reaching a portal, and inside the
              aqua room the two resolve to the same colour anyway (the room
              re-pours --accent-ink from these very triples).
            */}
            <Text className={cn("text-sm", active && "font-semibold text-foreground")}>
              {item.label}
            </Text>
            {active ? <Icon name="check" className="size-4 text-muted-foreground" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
