import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { authenticate } from "@/src/features/security/biometric";
import { useAppLockStore } from "@/src/features/security/app-lock-store";

// Re-lock when the app returns to the foreground after spending longer than this
// in the background. Keeps brief app-switches from forcing a re-auth.
const LOCK_TIMEOUT_MS = 30_000;

interface AppLockGateProps {
  children: React.ReactNode;
}

export function AppLockGate({ children }: AppLockGateProps) {
  const enabled = useAppLockStore((s) => s.enabled);

  // Web never locks, and when the preference is off this is a clean passthrough —
  // the default path renders children with zero added behavior.
  if (Platform.OS === "web" || !enabled) {
    return <>{children}</>;
  }

  return <LockedGate>{children}</LockedGate>;
}

function LockedGate({ children }: AppLockGateProps) {
  const { t } = useTranslation("security");
  const [locked, setLocked] = useState(true);
  const [authInProgress, setAuthInProgress] = useState(false);
  const authInProgressRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    // Ref-guard against concurrent prompts so a button press during the in-flight
    // auto-prompt is ignored, while a press *after* it resolves can retry.
    if (authInProgressRef.current) {
      return;
    }
    authInProgressRef.current = true;
    setAuthInProgress(true);
    try {
      const ok = await authenticate(t("lock.prompt"));
      if (ok) {
        setLocked(false);
      }
    } finally {
      authInProgressRef.current = false;
      setAuthInProgress(false);
    }
  }, [t]);

  // Auto-prompt once on mount so a cold launch goes straight to the biometric sheet.
  useEffect(() => {
    void unlock();
    // Intentionally run once on mount; unlock guards against concurrent prompts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-lock when returning to `active` after being backgrounded past the timeout.
  // Mirrors the AppState-listener pattern in initializeSupabaseAutoRefresh.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (backgroundedAt !== null && Date.now() - backgroundedAt > LOCK_TIMEOUT_MS) {
          setLocked(true);
        }
        return;
      }

      // background / inactive — record when we left the foreground.
      if (backgroundedAtRef.current === null) {
        backgroundedAtRef.current = Date.now();
      }
    });

    return () => subscription.remove();
  }, []);

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-6 p-8">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="h-20 w-20 items-center justify-center rounded-3xl bg-[hsl(var(--iris)/0.12)]"
        >
          <Icon name="lock" size={36} className="text-iris" />
        </View>
        <View className="items-center gap-2">
          <Text variant="h1" className="text-center">
            {t("lock.title")}
          </Text>
          <Text className="max-w-[40ch] text-center text-muted-foreground">
            {t("lock.description")}
          </Text>
        </View>
        <Button className="w-full max-w-xs" disabled={authInProgress} onPress={() => void unlock()}>
          <Icon name="fingerprint" size={18} />
          <Text>{t("lock.unlock")}</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
