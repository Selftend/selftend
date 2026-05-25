import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, type ButtonProps } from "@/src/components/react-native-reusables/button";
import { Card, CardDescription, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

interface StateAction {
  label: string;
  onPress: () => void;
  variant?: ButtonProps["variant"];
}

interface StateProps {
  action?: StateAction;
  description?: string;
  icon?: MaterialIconName;
  title: string;
}

export function LoadingState({ description, title }: StateProps) {
  return (
    <View className="items-center justify-center gap-3 p-6">
      <ActivityIndicator />
      <View className="items-center gap-1">
        <Text>{title}</Text>
        {description ? <Text variant="muted">{description}</Text> : null}
      </View>
    </View>
  );
}

export function ScreenLoading({ title }: { title: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <LoadingState title={title} />
    </SafeAreaView>
  );
}

export function EmptyState(props: StateProps) {
  return <StateCard {...props} />;
}

export function ErrorState(props: StateProps) {
  return <StateCard {...props} />;
}

function StateCard({ action, description, icon, title }: StateProps) {
  return (
    <Card>
      <View className="items-center gap-4 px-6">
        {icon ? (
          <View className="size-14 items-center justify-center rounded-full bg-muted">
            <Icon name={icon} className="size-7 text-muted-foreground" />
          </View>
        ) : null}
        <View className="items-center gap-1.5">
          <CardTitle className="text-center">{title}</CardTitle>
          {description ? (
            <CardDescription className="max-w-[42ch] text-center">{description}</CardDescription>
          ) : null}
        </View>
        {action ? (
          <Button onPress={action.onPress} variant={action.variant ?? "secondary"}>
            <Text>{action.label}</Text>
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
