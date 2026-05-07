import { Pressable } from "react-native";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface AccessibleCardLinkProps {
  className?: string;
  description?: string;
  onPress: () => void;
  title: string;
}

export function AccessibleCardLink({
  className,
  description,
  onPress,
  title,
}: AccessibleCardLinkProps) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      className={cn("rounded-xl", className)}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      role="button"
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      </Card>
    </Pressable>
  );
}
