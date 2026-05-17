import { ActivityIndicator, Modal, type ImageSourcePropType, View } from "react-native";

import { OnboardingIllustration } from "@/src/components/app/onboarding-illustration";
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

interface OnboardingModalProps {
  actionLabel: string;
  body: string[];
  errorMessage?: string;
  imageAccessibilityLabel?: string;
  imageSource?: ImageSourcePropType;
  isPending?: boolean;
  onComplete: () => void;
  title: string;
  visible: boolean;
}

export function OnboardingModal({
  actionLabel,
  body,
  errorMessage,
  imageAccessibilityLabel,
  imageSource,
  isPending = false,
  onComplete,
  title,
  visible,
}: OnboardingModalProps) {
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
            {imageSource ? (
              <OnboardingIllustration
                accessibilityLabel={imageAccessibilityLabel ?? title}
                height={190}
                source={imageSource}
                width={220}
              />
            ) : null}
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
