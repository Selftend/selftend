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

  // Both ids arrive already resolved: the repository maps a stored id the catalog lacks
  // to `none` on read (#1745), so each lane's summary and its picker's `selectedId`
  // name the same row. The sheet used to resolve the breath lane itself and the
  // ambient lane not at all - an unknown bed read "None" while the picker highlighted
  // nothing. The `?? [0]` fallbacks are belt-and-braces for a caller that bypasses
  // the repository, not a second resolver.
  const breathSound =
    BREATH_SOUNDS.find((s) => s.id === effective.breathSoundId) ?? BREATH_SOUNDS[0];
  const ambientSound =
    AMBIENT_SOUNDS.find((s) => s.id === effective.ambientSoundId) ?? AMBIENT_SOUNDS[0];

  return (
    // A bottom sheet, not a full-screen modal: the breathing session stays
    // visible behind it, so the wrapper pins no row and the X below is this
    // sheet's one Escape — pinned in its own header row OUTSIDE the
    // scroller (W20/#1257), so it no longer scrolls away with the lanes.
    <PressShieldModal surface="sheet" visible={visible} onRequestClose={onDismiss} transparent>
      <View className="flex-1 justify-end bg-black/40">
        <SafeAreaView edges={["bottom"]} className="rounded-t-2xl bg-background">
          <View className="flex-row items-center justify-between px-6 pt-6">
            <Text variant="h2">{t("breathing.sounds.title")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common:close")}
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={onDismiss}
            >
              <Icon name="close" className="size-6 text-muted-foreground" />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="gap-6 p-6">
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
                selectedId={breathSound.id}
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
                selectedId={ambientSound.id}
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
              `text-aqua-ink` because the hue is aqua's, and the ink token is
              the only spelling of it that clears AA at this size.
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
