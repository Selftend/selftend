import { ActivityIndicator, Modal, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface AppOnboardingProps {
  actionLabel: string;
  body: string[];
  errorMessage?: string;
  isPending?: boolean;
  onComplete: () => void;
  title: string;
  visible: boolean;
}

export function AppOnboarding({
  actionLabel,
  body,
  errorMessage,
  isPending = false,
  onComplete,
  title,
  visible,
}: AppOnboardingProps) {
  const reduceMotionEnabled = useReduceMotionEnabled();

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={() => undefined}
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{body[0]}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="gap-3">
                {body.slice(1).map((paragraph) => (
                  <Text className="text-sm text-muted-foreground" key={paragraph}>
                    {paragraph}
                  </Text>
                ))}
              </View>
              <Button disabled={isPending} onPress={onComplete}>
                {isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{actionLabel}</Text>
              </Button>
              {errorMessage ? (
                <Text className="text-sm text-destructive">{errorMessage}</Text>
              ) : null}
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
}
