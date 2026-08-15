import { ActivityIndicator, Modal, View } from "react-native";

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
}: ConfirmDialogProps) {
  const reduceMotionEnabled = useReduceMotionEnabled();

  /**
   * ⚠️ Unmounted when closed, NOT handed `visible={false}` (#1034).
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
   * dialog, so there is no window at all. The cost is the fade-OUT, which played
   * over a dialog the user had already dismissed; the fade-in is untouched.
   *
   * This also makes "one dialog on screen at a time" true by construction, which
   * a screen mounting three of these (habit detail) previously was not - closed
   * dialogs stayed queryable, and their labels collided with the open one's.
   */
  if (!visible) return null;

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={onCancel}
      transparent
      visible
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
              <Button disabled={isPending} onPress={onCancel} variant="secondary">
                <Text>{cancelLabel}</Text>
              </Button>
              <Button
                disabled={isPending}
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
