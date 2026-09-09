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
   * The heading level for the callout's title. **Defaults to 2**, which is what
   * all five call sites want; none passes this today.
   *
   * ⚠️ Kept as a prop rather than hardcoded, on the precedent `Section`'s own
   * `level` set (#2142): it landed with no caller passing it either, because a
   * shared block's correct level is a fact about its SURROUNDINGS, and the next
   * screen to mount one may not have these surroundings. Making the rule the
   * default rather than five repeated arguments is what keeps that honest - a
   * call site passing `level` should mean "this page is unusual", and right now
   * no page is.
   *
   * ☠️ **`1|2|3|4|5|6`, never `number`.** A default parameter only fires on
   * `undefined`, so `level={0}` would typecheck against `number`, survive the
   * default untouched, and reach the tree as an invalid `aria-level={0}`. Same
   * reasoning as `Section`'s `level` (#2142) and `Disclosure`'s `headingLevel`
   * (#2143).
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
 * ☠️ **The callout is a level-2 block on every one of them, and that is a rule
 * about what it IS rather than about where it sits** (#2137, completed #2167).
 * It is standing safety furniture appended to a page - never part of the content
 * around it. Level 3 filed it *below* `/support`'s and `/faq`'s level-2 blocks,
 * and *inside* the module homes' therapy-framework `h2`, so on DBT a reader
 * navigating by heading found *Use urgent support for urgent risk* nested in
 * *The four skill groups*. Two different broken shapes, one cause.
 *
 * ⚠️ The module homes have a WIDER outline defect this does not fix: their
 * framework `h2` fails to scope the blocks after it, so *Recent defusion logs*
 * (ACT) and *Review* (CBT) are still mis-nested at level 3. That is #2167's
 * remaining half and needs a per-screen ruling; the callout was separable
 * because it belongs to no framework by definition.
 *
 * ☠️ Heading levels cannot be verified by jest here - it runs `ios`, and RNW
 * renders a level-less `role="heading"` as `<h1>` on web. The level must be
 * explicit, and assertions must read it through `Number(...)`: `text.tsx`'s
 * `ARIA_LEVEL` map yields STRINGS while `CardTitle` and `Section` pass numbers.
 */
export function CrisisSupportCallout({ level = 2 }: CrisisSupportCalloutProps = {}) {
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
