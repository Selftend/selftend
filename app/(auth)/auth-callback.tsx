import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/button";
import { LoadingState } from "@/src/components/loading-state";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { completeAuthRedirect } from "@/src/features/auth/callback";
import { useSession } from "@/src/providers/session-provider";

export default function AuthCallbackScreen() {
  const { hasSupabaseConfig } = useSession();
  const url = Linking.useLinkingURL();
  const hasProcessedLink = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig || !url || hasProcessedLink.current) {
      return;
    }

    hasProcessedLink.current = true;
    let active = true;

    void (async () => {
      try {
        const outcome = await completeAuthRedirect(url);
        if (!active) {
          return;
        }

        if (outcome !== "authenticated") {
          router.replace("/(auth)/sign-in");
          return;
        }

        router.replace("/(app)/(tabs)");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to complete the auth link.");
      }
    })();

    return () => {
      active = false;
    };
  }, [hasSupabaseConfig, url]);

  if (!hasSupabaseConfig) {
    return (
      <Screen title="Supabase setup required">
        <NoticeCard
          body="Add your real Supabase URL and key before testing sign-in."
          title="Authentication is not configured"
          tone="warning"
        />
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen title="Authentication link problem">
        <NoticeCard body={errorMessage} title="Unable to continue" tone="warning" />
        <Button onPress={() => router.replace("/(auth)/sign-in")} text="Back to sign in" />
      </Screen>
    );
  }

  if (!url) {
    return (
      <Screen title="Authentication link required">
        <NoticeCard
          body="Open this screen from an email or OAuth sign-in redirect rather than navigating to it directly."
          title="Missing callback data"
          tone="warning"
        />
        <Button onPress={() => router.replace("/(auth)/sign-in")} text="Back to sign in" />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} title="Checking your link">
      <LoadingState label="Completing your sign-in..." />
    </Screen>
  );
}
