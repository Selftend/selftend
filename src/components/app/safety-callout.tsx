import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

type CrisisSupportCalloutProps = {
  /**
   * The heading level for the callout's title. Defaults to 3, which is
   * `CardTitle`'s own default and what all five call sites shipped before #2137.
   *
   * ☠️ **`1|2|3|4|5|6`, never `number`.** A default parameter only fires on
   * `undefined`, so `level={0}` would typecheck against `number`, survive the
   * default untouched, and reach the tree as an invalid `aria-level={0}`. Same
   * reasoning as `Section`'s `level` (#2142) and `Disclosure`'s `headingLevel`
   * (#2143); this is the third component to take one, so the shape is settled.
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

/**
 * The loud destructive-red crisis callout - the twin of `CrisisSupportBar`.
 *
 * ☠️ **The component is `CrisisSupportCallout`; the FILE is `safety-callout.tsx`.**
 * A sweep grepping the file name finds nothing and reads as "shipped but unused".
 *
 * Five call sites: the ACT, CBT and DBT module homes, `/support`, and `/faq`.
 *
 * ⚠️ **The level is a per-caller decision because the callout's neighbours differ**
 * (#2137). On `/support` and `/faq` it sits ABOVE level-2 blocks, so a level-3
 * title put a safety surface below the ordinary content that follows it and
 * skipped a level on the way down - those two pass `level={2}`. On the three
 * module homes the callout is the LAST block on the page among level-3 `Section`
 * eyebrows, where 3 is already consistent, so they keep the default and are
 * deliberately untouched.
 *
 * ☠️ Heading levels cannot be verified by jest here - it runs `ios`, and RNW
 * renders a level-less `role="heading"` as `<h1>` on web. The level must be
 * explicit, and assertions must read it through `Number(...)`: `text.tsx`'s
 * `ARIA_LEVEL` map yields STRINGS while `CardTitle` and `Section` pass numbers.
 */
export function CrisisSupportCallout({ level = 3 }: CrisisSupportCalloutProps = {}) {
  const { t } = useTranslation("common");
  // The callout's twin of the bar's jump (#1265, O3): `/crisis` is rooted at the
  // top, so its Up is Home, and a module home reached through it is exactly what
  // the user should be handed back.
  const pushWithOrigin = usePushWithOrigin();

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        {/*
          `CardTitle` spreads its props AFTER its own `aria-level={3}`, so this
          overrides rather than fights it - the same route `PolicySectionCards`
          and `/faq`'s answer cards already take.
        */}
        <CardTitle aria-level={level}>{t("safety.title")}</CardTitle>
        <CardDescription>{t("safety.description")}</CardDescription>
      </CardHeader>
      <View className="px-6">
        <Button onPress={() => pushWithOrigin("/crisis")} variant="secondary">
          <Text>{t("safety.openCrisis")}</Text>
        </Button>
      </View>
    </Card>
  );
}
