import { useState } from "react";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { HelpSheet } from "@/src/components/app/help-sheet";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { HELP_CONTENT, type HelpKey } from "@/src/features/help/help-content";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

interface HelpButtonProps {
  helpKey: HelpKey;
  size?: number;
  className?: string;
}

export function HelpButton({ helpKey, size = 20, className }: HelpButtonProps) {
  const { t } = useTranslation("help");
  const [open, setOpen] = useState(false);
  const label = `${t("ui.helpPrefix")}${t(HELP_CONTENT[helpKey].titleKey)}`;

  return (
    <>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={() => setOpen(true)}
      >
        <Icon name="help-outline" size={size} className={cn("text-muted-foreground", className)} />
      </Pressable>
      <HelpSheet helpKey={helpKey} visible={open} onDismiss={() => setOpen(false)} />
    </>
  );
}
