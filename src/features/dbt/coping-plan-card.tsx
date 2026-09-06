import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, enterKeyActivationProps } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";
import {
  COPING_PLAN_SECTIONS,
  findPick,
  pickLabelKey,
} from "@/src/features/dbt/coping-plan-registry";
import type { CopingPlanDocument, CopingPlanItem } from "@/src/features/dbt/types";

/**
 * The plan as it is READ - the card the builder exists to produce (spec §3.1.1).
 *
 * ☠️ **Opening this writes nothing.** No completion button, no "I used this",
 * no last-used date, no count. A surface someone opens in a hard moment must
 * not also be a surface that measures them for opening it, and the only fact
 * the programme reads about the plan is that it was touched since the phase
 * began - which the builder's save already records as `updatedAt`.
 *
 * ⚠️ **No `CrisisSupportBar`, and that is the ruled exception** (§9): every
 * other DBT entry screen carries it, and this one does not, because it is
 * read-only and opened *in* the hard moment. It shows the plan, not a warning
 * above the plan. The module home two taps away carries the full callout.
 *
 * A pick that has been retired from the registry resolves to nothing and is
 * dropped rather than rendered blank - the price of storing keys instead of
 * labels, and the reason the plan survives a copy rewrite at all.
 */

interface CopingPlanCardProps {
  plan: CopingPlanDocument;
  /** Rendered under the card; the builder's door. */
  footer?: React.ReactNode;
}

/** An item's words: an own line as written, a pick through the registry. */
export function useItemLabel() {
  const { t } = useTranslation("dbt");
  return (item: CopingPlanItem): string | null => {
    if (item.kind === "own") return item.text?.trim() || null;
    const pick = findPick(item.pickKey);
    return pick ? t(pickLabelKey(pick.key)) : null;
  };
}

export function CopingPlanCard({ plan, footer }: CopingPlanCardProps) {
  const { t } = useTranslation("dbt");
  const pushWithOrigin = usePushWithOrigin();
  const label = useItemLabel();

  const byId = new Map(plan.items.map((item) => [item.id, item]));
  const fallback = plan.fallback
    .map((id) => byId.get(id))
    .filter((item): item is CopingPlanItem => item !== undefined);
  const leadIns = t("copingPlan.leadIns", { returnObjects: true }) as unknown as string[];

  const sectionItems = (section: (typeof COPING_PLAN_SECTIONS)[number]) =>
    plan.items.filter((item) => item.section === section).sort((a, b) => a.position - b.position);

  if (plan.items.length === 0) {
    return (
      <View className="gap-6">
        <Text variant="muted">{t("copingPlan.cardEmpty")}</Text>
        {footer}
      </View>
    );
  }

  return (
    <View className="gap-8">
      {fallback.length > 0 ? (
        <View className="gap-3">
          <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
            {t("copingPlan.fallback.title")}
          </Text>
          {fallback.map((item, index) => {
            const text = label(item);
            if (!text) return null;
            return (
              <View key={item.id} className="gap-1">
                <Text variant="muted" className="text-[12.5px]">
                  {/* The sequence is named, not numbered: "First…", "If that
                      doesn't help…". A digit reads as a score to beat; a phrase
                      reads as what to do next. */}
                  {leadIns[Math.min(index, leadIns.length - 1)]}
                </Text>
                <View className="flex-row items-baseline gap-2">
                  <Text className="flex-1 text-[23px] font-extrabold leading-[1.2] tracking-tight">
                    {text}
                  </Text>
                  {item.homeOnly ? (
                    <Text variant="muted" className="text-[11.5px]">
                      {t("copingPlan.fallback.homeOnly")}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {COPING_PLAN_SECTIONS.map((section) => {
        const items = sectionItems(section);
        if (items.length === 0) return null;
        return (
          <View key={section} className="gap-2">
            <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
              {t(`copingPlan.sections.${section}.name`)}
            </Text>
            <View className="gap-1.5">
              {items.map((item) => {
                const text = label(item);
                if (!text) return null;
                const pick = item.kind === "pick" ? findPick(item.pickKey) : undefined;
                const route = pick?.route;
                if (!route) {
                  return (
                    <Text
                      key={item.id}
                      className={cn(
                        "text-[15px] leading-snug",
                        section === "remind" && "text-[16px] leading-relaxed",
                      )}
                    >
                      {text}
                    </Text>
                  );
                }
                const open = () => pushWithOrigin(route);
                return (
                  <Pressable
                    key={item.id}
                    // "link", because every press navigates - and a link with no
                    // `href` is a `<div role="link">` on web, which the browser
                    // does not activate on Enter, so it brings its own handler.
                    accessibilityRole="link"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={open}
                    {...enterKeyActivationProps(open)}
                    className="flex-row items-center gap-2 py-0.5 active:opacity-70"
                  >
                    <Text className={cn("text-[15px] leading-snug", CHROME_MARK)}>{text}</Text>
                    <Icon name="north-east" size={13} className={CHROME_MARK} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      {footer}
    </View>
  );
}
