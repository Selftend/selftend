import { Pressable, View } from "react-native";

import { BackButton } from "@/src/components/app/back-button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

export interface ModuleHomeHeaderAction {
  icon: MaterialIconName;
  accessibilityLabel: string;
  onPress: () => void;
}

interface ModuleHomeHeaderProps {
  title: string;
  actions?: readonly ModuleHomeHeaderAction[];
}

export function ModuleHomeHeader({ title, actions = [] }: ModuleHomeHeaderProps) {
  return (
    <View className="flex-row items-center gap-2">
      <BackButton showLabel={false} className="-ml-2" />
      <Text variant="h1" className="flex-1">
        {title}
      </Text>
      {actions.length > 0 ? (
        <View className="flex-row items-center gap-3">
          {actions.map((action) => (
            <Pressable
              key={action.icon}
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole="button"
              onPress={action.onPress}
              hitSlop={8}
            >
              <Icon name={action.icon} className="text-muted-foreground" size={20} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
