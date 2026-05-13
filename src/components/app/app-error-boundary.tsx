import { router } from "expo-router";
import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled app error", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleGoHome = () => {
    this.setState({ error: null });
    router.replace("/");
  };

  render(): ReactNode {
    if (this.state.error) {
      return <AppErrorFallback onGoHome={this.handleGoHome} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function AppErrorFallback({ onGoHome, onRetry }: { onGoHome: () => void; onRetry: () => void }) {
  const { t } = useTranslation("errors");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("fallback.title")}</Text>
            <Text variant="muted">{t("fallback.description")}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("fallback.cardTitle")}</CardTitle>
              <CardDescription>{t("fallback.cardDescription")}</CardDescription>
            </CardHeader>
          </Card>

          <View className="flex-row flex-wrap gap-3">
            <Button onPress={onRetry}>
              <Text>{t("fallback.retry")}</Text>
            </Button>
            <Button onPress={onGoHome} variant="secondary">
              <Text>{t("fallback.home")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
