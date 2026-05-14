import { ActivityIndicator, View } from "react-native";

import { Button, type ButtonProps } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

interface StateAction {
  label: string;
  onPress: () => void;
  variant?: ButtonProps["variant"];
}

interface StateProps {
  action?: StateAction;
  description?: string;
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

export function EmptyState(props: StateProps) {
  return <StateCard {...props} />;
}

export function ErrorState(props: StateProps) {
  return <StateCard {...props} />;
}

function StateCard({ action, description, title }: StateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {action ? (
        <View className="px-6">
          <Button onPress={action.onPress} variant={action.variant ?? "secondary"}>
            <Text>{action.label}</Text>
          </Button>
        </View>
      ) : null}
    </Card>
  );
}
