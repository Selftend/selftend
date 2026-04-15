import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { classNames } from "@/src/utils/class-names";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends PropsWithChildren {
  disabled?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  text: string;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-pine",
  secondary: "bg-moss",
  ghost: "bg-transparent border border-pine/15",
  danger: "bg-ember",
};

const textClasses: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-white",
  ghost: "text-ink",
  danger: "text-white",
};

export function Button({
  disabled = false,
  isLoading = false,
  onPress,
  text,
  variant = "primary",
}: ButtonProps) {
  const isBlocked = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      className={classNames(
        "min-h-12 items-center justify-center rounded-2xl px-4 py-3",
        variantClasses[variant],
        isBlocked && "opacity-50",
      )}
      disabled={isBlocked}
      onPress={onPress}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === "ghost" ? "#20312c" : "#ffffff"} />
      ) : (
        <Text className={classNames("text-base font-semibold", textClasses[variant])}>{text}</Text>
      )}
    </Pressable>
  );
}
