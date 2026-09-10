import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/src/components/react-native-reusables/text";
import { RouteHead } from "@/src/components/app/route-head";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { HOME_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";

interface PolicyPageLayoutProps extends PropsWithChildren {
  /**
   * The on-page subline as ONE plain string - the web document's
   * `description`, `og:description` (#2294). `subtitle` below can be a
   * fragment; a meta tag cannot, so the caller hands the sentence over twice
   * rather than the layout flattening a node tree into copy.
   */
  description: string;
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
 * before. The extraction existed so `/security`, which hand-rolled this same
 * structure inline, could fold into it - which it did on #2146, leaving one copy
 * of the chrome where there were two - and so `/faq` can build its own body on
 * the shared chrome (#2147) instead of forking the whole screen.
 *
 * ☠️ **The column goes on the PADDED BOX, not the inner `View`** (#2148, ruled on
 * #2136). `HOME_COLUMN` is 720; merged into `contentContainerClassName` beside
 * `p-6` it reads 720 outer − 2×24 gutters = the **672** that `/support`,
 * `/legal` and `/progress` already show. On the inner `View` the same constant
 * would read the full 720 — the module-home width, not this page's. `layout.ts`
 * documents the distinction; #1721 is where it was learned, and a previous
 * ticket got it backwards.
 *
 * Before this, all seven policy routes were exactly the defect `layout.ts` opens
 * by describing: edge-to-edge on a 1440px browser. `/legal` was the sharpest
 * case — a 672px page whose whole body is five buttons opening five of these
 * routes, so every click dropped out of the column that #1721 had just given it.
 *
 * The Escape is not conditional and never was: `ScreenHeader` renders
 * `<ScreenEscape />` unconditionally and its docblock forbids gating it. The
 * assertion that proves it lives in this file's test rather than
 * `info-screen.test.tsx`, where it was really a `ScreenHeader` test wearing an
 * `InfoScreen` costume.
 */
export function PolicyPageLayout({
  children,
  description,
  subtitle,
  title,
}: PolicyPageLayoutProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* The page's own <head> - title, description, og:*, canonical - from the
          same two strings the header and subline render, so "document title =
          on-page H1" is structural and no route file can forget it (#2294). */}
      <RouteHead title={title} description={description} />
      <ScrollView contentContainerClassName={cn("grow p-6", HOME_COLUMN)}>
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
