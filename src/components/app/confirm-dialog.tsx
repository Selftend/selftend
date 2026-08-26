import { ActivityIndicator, Modal, Platform, View } from "react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useThemePalette } from "@/src/lib/theme-palette";
import { useOverlayRegistration } from "@/src/stores/overlay-count-store";

interface ConfirmDialogProps {
  visible: boolean;
  isPending: boolean;
  error?: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
  /**
   * An optional third action that acts IN PLACE and leaves the dialog open -
   * the warn-and-abandon confirm's "Export your data first" (#1444). While it
   * runs, every button is held disabled: the decision the dialog exists for
   * should not race the side action it offered.
   */
  secondaryAction?: {
    label: string;
    onPress: () => void;
    isPending?: boolean;
  };
}

export function ConfirmDialog({
  visible,
  isPending,
  error,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
  destructive = true,
  secondaryAction,
}: ConfirmDialogProps) {
  const reduceMotionEnabled = useReduceMotionEnabled();
  // Overlay-count registry (#1473, spec §2 on #1142); the guard test derives
  // every raw-Modal renderer, so this line is not optional.
  useOverlayRegistration(visible);
  const theme = useThemePalette();
  const anyPending = isPending || secondaryAction?.isPending === true;

  /**
   * ⚠️ On WEB, a closed dialog is unmounted rather than handed `visible={false}`
   * (#1034).
   *
   * react-native-web's `Modal` keeps a DISMISSED dialog in the tree for the whole
   * 250ms fade-out, and it is not inert while it lingers. It is a full-viewport
   * `position: fixed; z-index: 9999` layer; its `ModalFocusTrap` holds a
   * document-level capture `focus` listener; and when that trap finally unmounts
   * it force-refocuses whatever was focused when the dialog opened. So anything
   * the user opens inside that window has focus yanked out from under it - and a
   * Radix popover, which dismisses on focus-outside, closes itself. That is the
   * habits overflow menu reopened right after Archive: it shut before "Delete"
   * could be pressed, ~20% of runs, timing the e2e suite out on changes that
   * could not have caused it.
   *
   * Returning null tears the whole portal down on the same commit that closes the
   * dialog, so there is no window at all. It also makes "one dialog on screen at
   * a time" true by construction, which a screen mounting three of these (habit
   * detail) was not - closed dialogs stayed queryable and their labels collided
   * with the open one's.
   *
   * ⚠️ Gated to web ON PURPOSE, rather than unmounting everywhere. The cost of
   * unmounting is the fade-OUT, and none of the above is a native problem: there
   * is no `document`, no `ModalFocusTrap`, and no Radix popover to dismiss.
   * Paying a polish cost on iOS and Android to fix a react-native-web bug would
   * be charging the two platforms that ship the product for a defect neither has.
   * The entrance animation is untouched on every platform.
   */
  if (!visible && Platform.OS === "web") return null;

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={onCancel}
      transparent
      // Still driven by the prop: on native this component is reached with
      // `visible` false (only web returns null above), and hardcoding true here
      // would leave every dialog permanently open on iOS and Android.
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {/* `role="alert"` because this replaces a toast for callers whose failure
                  cannot be toasted from behind this modal (#1335) - without it the
                  failure reaches a screen-reader user not at all. */}
              {error ? (
                <Text className="text-sm text-destructive" role="alert">
                  {error}
                </Text>
              ) : null}
              {secondaryAction ? (
                <Button
                  disabled={anyPending}
                  onPress={secondaryAction.onPress}
                  testID="confirm-dialog-secondary"
                  variant="secondary"
                >
                  {secondaryAction.isPending ? (
                    <ActivityIndicator color={theme.mutedForeground} />
                  ) : null}
                  <Text>{secondaryAction.label}</Text>
                </Button>
              ) : null}
              <Button disabled={anyPending} onPress={onCancel} variant="secondary">
                <Text>{cancelLabel}</Text>
              </Button>
              <Button
                disabled={anyPending}
                onPress={onConfirm}
                testID="confirm-dialog-confirm"
                variant={destructive ? "destructive" : "default"}
              >
                {isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{confirmLabel}</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
}
