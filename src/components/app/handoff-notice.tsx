import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * The line a form shows when it kept the draft the person was holding and the
 * door's hand-off was dropped (#2206).
 *
 * ☠️☠️ **Inline, because a toast is a channel this notice cannot afford.** The
 * hand-off is consumed either way and is unrecoverable, so this sentence is the
 * only record that anything was dropped - and the toast slot is allowed to
 * discard it: an unread error toast already on screen refuses the incoming one
 * outright (`toast-store.ts`), a full queue drops it, and on the path where it
 * does show it auto-dismisses after 2.5s carrying an instruction the person is
 * meant to act on later. This is the same argument `FreshStartNotice` makes for
 * the same reason: a sentence that has to be read waits to be read.
 *
 * Dismissible by the person and by nothing else - it is not a modal, it blocks
 * nothing, and it says what to do to get the hand-off back rather than treating
 * the loss as final. The toast is still raised beside it; this is the copy that
 * has to survive.
 */
export function HandoffNotice({ visible }: { visible: boolean }) {
  const { t } = useTranslation("common");
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      testID="handoff-notice"
      className="flex-row items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3"
    >
      <View className="flex-1 gap-1">
        <Text className="text-sm font-medium">{t("handoff.keptDraft")}</Text>
        <Text variant="muted" className="text-sm">
          {t("handoff.notCarriedOver")}
        </Text>
      </View>
      <Button
        accessibilityLabel={t("close")}
        size="sm"
        variant="ghost"
        onPress={() => setDismissed(true)}
      >
        <Icon name="close" className="size-4 text-foreground" />
      </Button>
    </View>
  );
}
