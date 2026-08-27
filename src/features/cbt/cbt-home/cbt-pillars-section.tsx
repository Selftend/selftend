import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { PillarCard } from "@/src/components/app/pillar-card";
import { Section } from "@/src/components/app/section";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { PILLAR_STRATEGIES, SHARED_TOOLS_BY_PILLAR } from "./cbt-home-config";

interface CbtPillarsSectionProps {
  /** Draw the top hairline. See `deriveSectionRules`. */
  ruled: boolean;
}

/**
 * ⚠️ The framework heading stays at **level 2**, and is the one heading on this
 * screen that is not a `Section` eyebrow.
 *
 * "Every section heading is a real heading with a level-3 role" is about the
 * hand-rolled `variant="h3"`s that had no role at all. This one is already a
 * real heading, and it *introduces* the pillars beneath it - flattening it to 3
 * would put it on a level with the blocks it contains and leave the page with no
 * outline at all, which is the opposite of what that rule wants. The outline
 * reads h1 -> h2 -> h3, exactly as it does on ACT's home, where the same call
 * was made and accepted (#1378). `cbt-home-screen.test.tsx` pins it so the
 * exception is asserted rather than merely argued.
 *
 * It still renders THROUGH `Section` rather than beside it: the block wants the
 * same rule and the same rhythm as its neighbours, and hand-rolling the wrapper
 * put `Section`'s own hairline tokens in a second place. `Section` takes no
 * `title` here precisely because its title slot is the level-3 eyebrow.
 */
export function CbtPillarsSection({ ruled }: CbtPillarsSectionProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");

  return (
    <Section ruled={ruled} className="gap-6">
      <View>
        <Text variant="h2" className="text-xl font-bold tracking-tight">
          {t("pillars.intro")}
        </Text>
        <Text variant="muted" className="mt-1.5 text-sm leading-snug max-w-[62ch]">
          {t("pillars.introDescription")}
        </Text>
      </View>

      {(["think", "act", "be"] as const).map((pillar) => (
        <View key={pillar} className="gap-2">
          <PillarCard
            letter={t(`pillars.${pillar}.letter`)}
            title={t(`pillars.${pillar}.title`)}
            kicker={t(`pillars.${pillar}.sub`)}
            description={t(`pillars.${pillar}.description`)}
            onToolPress={(toolKey) => {
              const strategy = PILLAR_STRATEGIES[pillar].find((s) => s.key === toolKey);
              if (strategy?.route) pushWithOrigin(strategy.route);
            }}
          >
            {PILLAR_STRATEGIES[pillar].map((strategy) => (
              <PillarCard.Tool
                key={strategy.key}
                toolKey={strategy.key}
                icon={strategy.icon}
                name={t(strategy.labelKey)}
                desc={t(strategy.descKey)}
              />
            ))}
          </PillarCard>
          {SHARED_TOOLS_BY_PILLAR[pillar].length > 0 ? (
            <View className="ml-5 mr-2">
              <SharedToolsRow
                heading={t("pillars.usesSharedTools")}
                tools={SHARED_TOOLS_BY_PILLAR[pillar]}
              />
            </View>
          ) : null}
        </View>
      ))}
    </Section>
  );
}
