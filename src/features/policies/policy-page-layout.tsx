import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";

interface PolicyPageLayoutProps extends PropsWithChildren {
  /**
   * ☠️ `ReactNode`, NOT `string`, and that is load-bearing rather than
   * permissive. `InfoScreen` renders the subtitle and the `lastUpdated` suffix
   * as TWO children of one `Text`. Typing this `string` would force the caller
   * to concatenate them, which changes the rendered node tree and can move an
   * RNTL `getByText` - the caller passes the fragment through instead.
   */
  subtitle: ReactNode;
  title: string;
}

/**
 * The chrome every policy page shares: the safe area, the scrolling column, and
 * the header block of title + muted subtitle.
 *
 * Extracted from `info-screen.tsx` on #2144, which is a PURE REFACTOR - the six
 * routes that render through `InfoScreen` produce exactly what they produced
 * before. The extraction exists so `/security`, which hand-rolls this same
 * structure inline, can fold into it (#2146), and so `/faq` can build its own
 * body on the shared chrome (#2147) instead of forking the whole screen.
 *
 * ⚠️ **No column class here, deliberately.** The 672px content column is the
 * next slice (#2148). Keeping it out is what lets this one be reviewed against
 * the only gate that matters for a refactor: the diff changes nothing on screen.
 *
 * The Escape is not conditional and never was: `ScreenHeader` renders
 * `<ScreenEscape />` unconditionally and its docblock forbids gating it. The
 * assertion that proves it lives in this file's test rather than
 * `info-screen.test.tsx`, where it was really a `ScreenHeader` test wearing an
 * `InfoScreen` costume.
 */
export function PolicyPageLayout({ children, subtitle, title }: PolicyPageLayoutProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={title} />
            <Text variant="muted">{subtitle}</Text>
          </View>

          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
