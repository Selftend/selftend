import { useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";

export interface PickerSheetProps<TDraft> {
  visible: boolean;
  onClose: () => void;
  /** Seeds a fresh draft each time the sheet opens. */
  initialDraft: TDraft;
  /** The single commit point. Fires on Done, never while the user is picking. */
  onConfirm: (draft: TDraft) => void;
  /**
   * Optional, and the whole footer shape follows from it: present grows a
   * quiet Clear beside Done, absent leaves one full-width Done. Clear is a
   * COMMIT of "no value" and closes the sheet — not a draft edit.
   */
  onClear?: () => void;
  /** The picker itself, handed the sheet's draft and a way to move it. */
  children: (draft: TDraft, setDraft: (next: TDraft) => void) => ReactNode;
}

/**
 * The chrome and commit cycle every picker in the app shares: modal, dimmed
 * backdrop, card, footer — and nothing about what is being picked.
 *
 * Deliberately `children` rather than a mode enum. Not every picker in the app
 * comes from the same library (the native time spinner is
 * `@react-native-community/datetimepicker`), and an enum would leave that copy
 * of the chrome alive permanently.
 *
 * The sheet owns the draft, so there is no live `onChange` to misuse:
 * a selection is provisional until Done, and dismissing — backdrop or
 * Escape — discards it by unmounting.
 *
 * Cross-cutting modal behaviour is inherited, not restated: rendering through
 * `PressShieldModal` brings the #1054 web-unmount gate and the reduce-motion
 * collapse with it, so neither appears in this file.
 */
export function PickerSheet<TDraft>({
  visible,
  onClose,
  initialDraft,
  onConfirm,
  onClear,
  children,
}: PickerSheetProps<TDraft>) {
  return (
    <PressShieldModal visible={visible} transparent animation="fade" onRequestClose={onClose}>
      {/* The body unmounts on close, so each open seeds a fresh draft from the
          committed value — reopening adjusts what was saved, never a stale draft. */}
      {visible ? (
        <SheetBody
          initialDraft={initialDraft}
          onClose={onClose}
          onConfirm={onConfirm}
          onClear={onClear}
        >
          {children}
        </SheetBody>
      ) : null}
    </PressShieldModal>
  );
}

function SheetBody<TDraft>({
  initialDraft,
  onClose,
  onConfirm,
  onClear,
  children,
}: Omit<PickerSheetProps<TDraft>, "visible">) {
  const { t } = useTranslation("common");
  const [draft, setDraft] = useState<TDraft>(initialDraft);

  const confirm = () => {
    onConfirm(draft);
    onClose();
  };

  const clear = () => {
    onClear?.();
    onClose();
  };

  return (
    // Card heights are width-invariant and already outgrow a landscape phone;
    // centered overflow without a scroller splits top and bottom, and the half
    // that gets clipped is the footer — i.e. Done, the only way to commit
    // (#1231).
    <ScrollView
      className="flex-1"
      contentContainerClassName="grow items-center justify-center p-3 sm:p-6"
    >
      {/* Dimmed backdrop - tap anywhere outside the card to close without
          applying. A sibling behind the card rather than a wrapper: a wrapping
          button would nest the picker's buttons inside a <button> on web, which
          the DOM forbids. */}
      <Pressable
        accessibilityLabel={t("close")}
        accessibilityRole="button"
        className="absolute inset-0 bg-black/50"
        onPress={onClose}
        role="button"
        // Out of the web Tab order (invisible to sighted keyboard users, who
        // have Escape); touch-exploration screen readers keep a labeled close.
        {...(Platform.OS === "web" ? { tabIndex: -1 as const } : {})}
      />
      <View className="w-full max-w-[340px] rounded-2xl bg-card p-3">
        {children(draft, setDraft)}
        {onClear ? (
          <View className="mt-2 flex-row gap-2">
            <Button variant="ghost" className="flex-1" onPress={clear}>
              <Text>{t("clear")}</Text>
            </Button>
            <Button className="flex-1" onPress={confirm}>
              <Text>{t("done")}</Text>
            </Button>
          </View>
        ) : (
          <View className="mt-2">
            <Button onPress={confirm}>
              <Text>{t("done")}</Text>
            </Button>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
