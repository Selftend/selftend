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

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={onCancel}
      transparent
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
              {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
              <Button disabled={isPending} onPress={onCancel} variant="secondary">
                <Text>{cancelLabel}</Text>
              </Button>
              <Button
                disabled={isPending}
                onPress={onConfirm}
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
