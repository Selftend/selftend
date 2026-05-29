import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { cssInterop } from "nativewind";
import * as React from "react";

import { TextClassContext } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

export type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

cssInterop(MaterialIcons, {
  className: {
    target: "style",
    nativeStyleToProp: {
      color: "color",
      height: "size",
      width: "size",
    },
  },
});

interface IconProps extends Omit<ComponentProps<typeof MaterialIcons>, "name"> {
  name: MaterialIconName;
  className?: string;
}

const TEXT_SIZE_CLASSES = new Set([
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl",
  "text-5xl",
  "text-6xl",
  "text-7xl",
  "text-8xl",
  "text-9xl",
]);

const TAILWIND_SIZE_TO_PX: Record<string, number> = {
  "size-3": 12,
  "size-3.5": 14,
  "size-4": 16,
  "size-5": 20,
  "size-6": 24,
  "size-7": 28,
  "size-8": 32,
  "size-9": 36,
  "size-10": 40,
};

function iconColorClasses(className: string | undefined) {
  if (!className) {
    return undefined;
  }

  return className
    .split(/\s+/)
    .filter((token) => {
      const utility = token.slice(token.lastIndexOf(":") + 1);
      return utility.startsWith("text-") && !TEXT_SIZE_CLASSES.has(utility);
    })
    .join(" ");
}

function iconSizeFromClasses(className: string | undefined) {
  if (!className) {
    return undefined;
  }

  const tokens = className.split(/\s+/);
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const utility = tokens[index].slice(tokens[index].lastIndexOf(":") + 1);
    const size = TAILWIND_SIZE_TO_PX[utility];
    if (size) {
      return size;
    }
  }

  return undefined;
}

function Icon({ name, className, size, style, ...props }: IconProps) {
  const textClass = React.useContext(TextClassContext);
  const resolvedClassName = cn(
    "size-6 shrink-0 text-foreground leading-none pointer-events-none",
    iconColorClasses(textClass),
    className,
  );
  const resolvedSize = size ?? iconSizeFromClasses(resolvedClassName);

  return (
    <MaterialIcons
      name={name}
      // Icons are decorative by default — they pair with a text label or sit
      // inside a Button/Pressable that carries the accessible name. Leaving
      // them in the a11y tree pollutes parent accessible names with the glyph
      // character (e.g. button reads " Sign out" instead of "Sign out").
      // Callers that need a labelled standalone icon can override.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      className={resolvedClassName}
      size={resolvedSize}
      style={
        resolvedSize
          ? [{ lineHeight: resolvedSize, alignContent: "center", textAlign: "center" }, style]
          : style
      }
      {...props}
    />
  );
}

export { Icon };
