import { router } from "expo-router";
import { Platform, View } from "react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { authenticate, isBiometricAvailable } from "@/src/features/security/biometric";
import { useAppLockStore } from "@/src/features/security/app-lock-store";
import { useToastStore } from "@/src/stores/toast-store";

export function SecuritySection() {
  const { t } = useTranslation("settings");
  const showToast = useToastStore((s) => s.showToast);
  const enabled = useAppLockStore((s) => s.enabled);
  const setEnabled = useAppLockStore((s) => s.setEnabled);
  const hydrate = useAppLockStore((s) => s.hydrate);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate().catch(() => {});
    let active = true;
    void isBiometricAvailable()
      .then((result) => {
        if (active) {
          setAvailable(result);
        }
      })
      .catch(() => {
        if (active) {
          setAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [hydrate]);

  // Native-only: the app lock never appears on web (which relies on browser session + logout).
  if (Platform.OS === "web") {
    return null;
  }

  const canToggle = available === true && !busy;

  const handleToggle = async (next: boolean) => {
    // Both directions require a successful auth: turning ON so the user can't lock
    // themselves out, and turning OFF so a non-owner who picks up an unlocked-looking
    // session can't disable the protection. authenticate() keeps the passcode fallback
    // on (disableDeviceFallback:false), so requiring it to disable can't lock anyone out.
    setBusy(true);
    try {
      const confirmed = await authenticate(t("security.appLockConfirm"));
      if (confirmed) {
        await setEnabled(next);
      }
    } catch {
      // setEnabled persists before flipping state, so the toggle stays consistent on a
      // failed write; just surface the error.
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-start gap-3">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--iris)/0.10)]"
        >
          <Icon name="shield" size={20} className="text-iris" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-base font-semibold">{t("security.title")}</Text>
          <Text className="mt-1 text-xs leading-snug text-muted-foreground">
            {t("security.description")}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-3 rounded-xl border border-border p-3">
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold">{t("security.appLock")}</Text>
            <Text className="mt-1 text-xs leading-snug text-muted-foreground">
              {available === false
                ? t("security.appLockUnavailable")
                : t("security.appLockDescription")}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t("security.appLock")}
            checked={enabled}
            disabled={!canToggle}
            onCheckedChange={(next) => void handleToggle(next)}
          />
        </View>

        <Button
          variant="outline"
          className="justify-start"
          onPress={() => router.push("/security")}
        >
          <Icon name="lock" size={18} />
          <Text className="flex-1">{t("security.openSecurity")}</Text>
          <Icon name="chevron-right" size={18} className="text-muted-foreground" />
        </Button>
      </View>
    </Card>
  );
}
