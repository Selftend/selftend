import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useCookieConsentStore } from "@/src/stores/cookie-consent-store";

export function CookieConsentBanner() {
  const { accepted, hydrate, acceptAll, acceptEssentialOnly } = useCookieConsentStore();
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Only show on web and only if consent hasn't been given
  if (Platform.OS !== "web" || accepted) {
    return null;
  }

  if (showManage) {
    return <CookiePreferencesPanel onDone={() => setShowManage(false)} />;
  }

  return (
    <View className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg">
      <View className="mx-auto w-full max-w-2xl gap-3">
        <Text className="text-sm">
          We use essential browser storage (localStorage) to keep you signed in. No tracking cookies are used. You can manage optional preferences below.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Button onPress={acceptAll} size="sm">
            <Text>Accept all</Text>
          </Button>
          <Button onPress={acceptEssentialOnly} size="sm" variant="secondary">
            <Text>Essential only</Text>
          </Button>
          <Button onPress={() => setShowManage(true)} size="sm" variant="ghost">
            <Text>Manage preferences</Text>
          </Button>
          <Button onPress={() => router.push("/cookies")} size="sm" variant="ghost">
            <Text>Cookie policy</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

interface CookiePreferencesPanelProps {
  onDone?: () => void;
}

export function CookiePreferencesPanel({ onDone }: CookiePreferencesPanelProps) {
  const { analytics, setAnalytics, acceptEssentialOnly, acceptAll } = useCookieConsentStore();
  const [analyticsToggle, setAnalyticsToggle] = useState(analytics);

  const handleSave = () => {
    if (analyticsToggle) {
      acceptAll();
    } else {
      acceptEssentialOnly();
    }
    onDone?.();
  };

  return (
    <View className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg">
      <View className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Cookie preferences</CardTitle>
            <CardDescription>
              Manage how the app uses browser storage on your device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 gap-1">
                  <Text className="font-medium">Essential storage</Text>
                  <Text className="text-sm text-muted-foreground">
                    Required for authentication. Cannot be disabled.
                  </Text>
                </View>
                <Text className="text-sm font-medium text-muted-foreground">Always on</Text>
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 gap-1">
                  <Text className="font-medium">Analytics</Text>
                  <Text className="text-sm text-muted-foreground">
                    Not currently used. This preference will apply if analytics are added in the future.
                  </Text>
                </View>
                <Switch checked={analyticsToggle} onCheckedChange={setAnalyticsToggle} />
              </View>
              <View className="flex-row gap-2">
                <Button onPress={handleSave} size="sm">
                  <Text>Save preferences</Text>
                </Button>
                {onDone ? (
                  <Button onPress={onDone} size="sm" variant="ghost">
                    <Text>Cancel</Text>
                  </Button>
                ) : null}
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
