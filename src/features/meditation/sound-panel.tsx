import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ChoiceRow } from "@/src/components/app/choice-row";
import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { VolumeRail } from "@/src/components/app/volume-rail";
import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { AMBIENT_SOUNDS } from "@/src/constants/breathing-sounds";

interface SoundPanelProps {
  visible: boolean;
  /** Done, Escape and the OS back all arrive here; closing changes nothing. */
  onClose: () => void;
  /** The SIT's bed, not the query's - see the props note below. */
  bedId: string;
  bedVolume: number;
  onPickBed: (id: string) => void;
  /** Every pan move while the rail is dragged. Local only. */
  onChangeVolume: (volume: number) => void;
  /** The end of a drag, and the only moment the volume is written. */
  onCommitVolume: (volume: number) => void;
}

/**
 * The sound panel (`docs/sound.md` §1.2): where the bed under a running sit and
 * its volume are changed, without leaving the sit.
 *
 * It holds **three things and no fourth** - a header row, the beds, and the
 * volume once a bed is chosen - and that is a measurement, not a preference.
 * Of the three layouts prototyped at 360x780 in `bg` (#2442), chips with a
 * full-width Done measured 393px and a list of rows 673px; this one measured
 * 315px, and it is the only one that leaves the ring *and* the countdown
 * numeral visible behind it. So: no full-width Done, no list rows, no empty
 * state, no hint copy, and the row of chips wears no eyebrow of its own because
 * the header already says the words.
 *
 * **Everything applies live.** There is no confirm and no cancel, so closing
 * changes nothing and Done is only a way out. Opening does not pause the clock -
 * auditioning a bed under the running clock is the point of "from within a
 * sitting".
 *
 * **Where §1.4's accessibility contract actually lives.** The dialog role,
 * `aria-modal`, the Tab trap, Escape closing through `onRequestClose` and focus
 * returning to the door are all react-native-web's `Modal` - `ModalContent`
 * writes the role and the Escape listener, `ModalFocusTrap` captures the active
 * element on mount and refocuses it on unmount, which is the door because
 * `PressShieldModal` unmounts a closed modal outright on web (#1054). None of
 * that is visible to jest, which runs as iOS; what this file owns is the rest -
 * the heading, the visible label on every control, and the backdrop that is
 * deliberately not pressable.
 *
 * ☠️ **The bed and its volume arrive as PROPS and this file never reads
 * `useUserPreferences`** (§2). The sit owns what is playing for its own length:
 * `useUpdateUserPreferences` writes optimistically and ROLLS BACK on error, so a
 * panel reading the query would show the rolled-back bed while the lane played
 * the picked one - its selected chip and what is audible disagreeing at exactly
 * the moment that matters. Its own test mocks both hooks to throw.
 */
export function SoundPanel({
  visible,
  onClose,
  bedId,
  bedVolume,
  onPickBed,
  onChangeVolume,
  onCommitVolume,
}: SoundPanelProps) {
  const { t } = useTranslation("timer");
  const heading = t("ambient.label");

  return (
    // A bottom sheet, so the ring and the countdown stay visible behind it: the
    // wrapper pins no escape row for `surface="sheet"`, and this panel's way out
    // is the header's Done plus the platform's own dismissal (Escape on web,
    // hardware back on Android), which `onRequestClose` carries.
    <PressShieldModal
      surface="sheet"
      visible={visible}
      onRequestClose={onClose}
      testID="sound-panel"
      transparent
    >
      {/* ⚠️ A plain View, NOT breathing's backdrop `Pressable` (§1.4). Tap-outside
          dismissal is deliberately off here: a stray tap during a sit - or a
          screen-reader user's exploratory touch - must not close the panel out
          from under them. The sheet is not covering a screen they can act on. */}
      <View className="flex-1 justify-end bg-black/40">
        {/* On a desktop window the panel lines up with the focus shell's own
            620px column (`focus-session-shell.tsx`) rather than stretching into
            a full-width bar. Below 620 it is the full width, as a sheet is. */}
        <SafeAreaView
          edges={["bottom"]}
          className="w-full max-w-[620px] self-center rounded-t-2xl bg-background"
          testID="sound-panel-sheet"
        >
          <View className="gap-6 p-6">
            <View className="flex-row items-center justify-between gap-3">
              {/* Spelled out rather than `variant="h2"`, which breathing's
                  Sounds sheet uses: h2 is 30px, and at 360dp the Bulgarian
                  heading plus its Done on one row leaves almost nothing spare.
                  20px is what the prototype measured the 315px panel at, and it
                  is the size the after-sit title on this screen already wears.
                  Every token is written out because overriding a variant's
                  weight in `className` loads the wrong FONT FACE (#1828). */}
              <Text
                aria-level={2}
                className="shrink text-xl font-bold tracking-tight"
                numberOfLines={1}
                role="heading"
              >
                {heading}
              </Text>
              {/* Ghost, and on this row rather than full-width beneath the
                  controls: the full-width shape cost 78px the ring needed. */}
              <Button onPress={onClose} variant="ghost">
                <Text>{t("common:done")}</Text>
              </Button>
            </View>
            {/* The home card's own row of chips, `None` first and unmarked
                (#1742) - the same nine beds in the same order, so the sit's two
                places to choose one cannot drift apart. Its eyebrow is hidden
                because the heading above already is it. */}
            <ChoiceRow
              label={heading}
              labelHidden
              onChange={onPickBed}
              options={AMBIENT_SOUNDS.map((sound) => ({
                value: sound.id,
                label: t(`cbt:${sound.labelKey}` as Parameters<typeof t>[0]),
              }))}
              testID="sound-panel-beds"
              value={bedId}
            />
            {/* Only while a bed is chosen: silence needs no volume, and a rail
                sitting at 0% under `None` would read as something unfinished. */}
            {bedId === "none" ? null : (
              <VolumeRail
                accessibilityLabel={t("ambient.volumeLabel")}
                icon="graphic-eq"
                label={t("ambient.volumeShort")}
                onChange={onChangeVolume}
                onCommit={onCommitVolume}
                value={bedVolume}
              />
            )}
          </View>
        </SafeAreaView>
      </View>
    </PressShieldModal>
  );
}
