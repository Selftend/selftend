import type { PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, type ButtonProps } from "@/src/components/react-native-reusables/button";
import { Card, CardDescription, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";

interface StateAction {
  label: string;
  onPress: () => void;
  variant?: ButtonProps["variant"];
}

interface StateProps {
  action?: StateAction;
  description?: string;
  icon?: MaterialIconName;
  title: string;
}

export function LoadingState({ description, title }: StateProps) {
  return (
    <View className="items-center justify-center gap-3 p-6">
      <ActivityIndicator />
      <View className="items-center gap-1">
        <Text>{title}</Text>
        {description ? <Text variant="muted">{description}</Text> : null}
      </View>
    </View>
  );
}

/**
 * A whole screen standing in for one that has not arrived yet - or never will.
 *
 * The two shapes below carry `ScreenTopBar`, and that is the entire point of
 * their existing (#1328). A screen that renders its chrome on the happy path
 * and early-returns a bare `SafeAreaView` while loading strands the user on the
 * branch that actually rendered: no arrow, no trail, nothing to press. R3 admits
 * no such carve-out - "never absent below the root, no conditional carve-outs" -
 * and a loading state is not a declared exception, it is an undeclared one.
 * Fifty-two screens shipped that shape before the gate could see branches.
 *
 * ☠️ So the bar is NOT decoration and must stay unconditional. Anything that
 * replaces a whole screen belongs in one of these, rather than in a hand-rolled
 * `SafeAreaView` at the call site - which is how the defect spread the first
 * time. `LoadingState` and `ErrorState` below stay chrome-less on purpose: they
 * are BODIES, dropped into a screen whose chrome is already mounted above them.
 */
function ScreenStateShell({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Full bleed, outside the padding: the bar's bottom hairline has to
          reach both edges. */}
      <ScreenTopBar />
      <View className="grow justify-center p-6">{children}</View>
    </SafeAreaView>
  );
}

export function ScreenLoading({ description, title }: { description?: string; title: string }) {
  return (
    <ScreenStateShell>
      <LoadingState description={description} title={title} />
    </ScreenStateShell>
  );
}

/**
 * The screen for a record that is missing, deleted, or addressed by a segment
 * that never named anything - the branch a stale link or a hand-typed id lands
 * on. It is the one a user is most likely to need the Escape from, because
 * there is nothing else on it to press.
 */
export function ScreenNotFound(props: StateProps) {
  return (
    <ScreenStateShell>
      <ErrorState {...props} />
    </ScreenStateShell>
  );
}

export function EmptyState(props: StateProps) {
  return <StateCard {...props} />;
}

export function ErrorState(props: StateProps) {
  return <StateCard {...props} />;
}

function StateCard({ action, description, icon, title }: StateProps) {
  return (
    <Card>
      <View className="items-center gap-4 px-6">
        {icon ? (
          <View className="size-14 items-center justify-center rounded-full bg-muted">
            <Icon name={icon} className="size-7 text-muted-foreground" />
          </View>
        ) : null}
        <View className="items-center gap-1.5">
          <CardTitle className="text-center">{title}</CardTitle>
          {description ? (
            <CardDescription className="max-w-[42ch] text-center">{description}</CardDescription>
          ) : null}
        </View>
        {action ? (
          <Button onPress={action.onPress} variant={action.variant ?? "secondary"}>
            <Text>{action.label}</Text>
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
