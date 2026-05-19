import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";

interface WidgetCardProps {
  children: React.ReactNode;
  editMode: boolean;
  onRemove: () => void;
  title: string;
}

export function WidgetCard({ children, editMode, onRemove, title }: WidgetCardProps) {
  const { t } = useTranslation("navigation");

  return (
    <View className={editMode ? "pt-3 pr-3" : undefined}>
      {children}
      {editMode ? (
        <Pressable
          accessibilityLabel={t("today.dashboard.removeWidget", { title })}
          accessibilityRole="button"
          onPress={onRemove}
          className="absolute right-0 top-0 size-6 items-center justify-center rounded-full bg-destructive"
        >
          <Icon name="close" className="size-3.5 text-white" size={14} />
        </Pressable>
      ) : null}
    </View>
  );
}
