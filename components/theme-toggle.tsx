import { MoonIcon, SunIcon } from "lucide-react-native";
import * as SwitchPrimitives from "@rn-primitives/switch";
import { Platform } from "react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  resolveThemePreference,
  useSystemColorScheme,
} from "@/src/lib/color-scheme";
import { useThemeStore } from "@/src/stores/theme-store";

export function ThemeToggle() {
  const { preference, setPreference } = useThemeStore();
  const systemColorScheme = useSystemColorScheme();
  const colorScheme = resolveThemePreference(preference, systemColorScheme);
  const isDark = colorScheme === "dark";

  return (
    <SwitchPrimitives.Root
      accessibilityLabel="Toggle dark theme"
      aria-valuetext={isDark ? "Dark theme" : "Light theme"}
      checked={isDark}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border border-border shadow-sm shadow-black/5",
        Platform.select({
          web: "focus-visible:border-ring focus-visible:ring-ring/50 outline-none transition-all focus-visible:ring-[3px]",
        }),
        "bg-secondary",
      )}
      onCheckedChange={(checked) => setPreference(checked ? "dark" : "light")}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "absolute top-px size-7 items-center justify-center rounded-full bg-background shadow-sm transition-all",
          Platform.select({
            web: "pointer-events-none flex ring-0",
          }),
          isDark ? "right-0.5" : "left-0.5",
        )}
      >
        <Icon
          as={isDark ? MoonIcon : SunIcon}
          className="size-4 text-foreground"
        />
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
}
