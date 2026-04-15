import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { classNames } from "@/src/utils/class-names";

interface ScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  scroll?: boolean;
  className?: string;
}

export function Screen({ children, className, footer, scroll = true, subtitle, title }: ScreenProps) {
  const content = (
    <View className={classNames("gap-6 px-5 pb-8 pt-4", className)}>
      {title ? (
        <View className="gap-2">
          <View className="gap-2">
            <TextHeading>{title}</TextHeading>
            {subtitle ? <TextBody>{subtitle}</TextBody> : null}
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      {scroll ? <ScrollView contentContainerClassName="grow">{content}</ScrollView> : content}
      {footer ? <View className="border-t border-black/5 bg-canvas px-5 py-4">{footer}</View> : null}
    </SafeAreaView>
  );
}

function TextHeading({ children }: PropsWithChildren) {
  return <Text className="text-3xl font-semibold text-ink">{children}</Text>;
}

function TextBody({ children }: PropsWithChildren) {
  return <Text className="text-base leading-6 text-ink/70">{children}</Text>;
}
