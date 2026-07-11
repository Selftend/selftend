import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { PillarCard } from "@/src/components/app/pillar-card";
import {
  PILLAR_STRATEGIES,
  SHARED_TOOLS_BY_PILLAR,
  type AdvancedToolInfoKey,
} from "./cbt-home-config";
import { SharedToolsRow } from "./shared-tools-row";

interface CbtPillarsSectionProps {
  onOpenInfo: (key: AdvancedToolInfoKey) => void;
}

export function CbtPillarsSection({ onOpenInfo }: CbtPillarsSectionProps) {
  const { t } = useTranslation("cbt");

  return (
    <View className="gap-6">
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
            tint={pillar}
            letter={t(`pillars.${pillar}.letter`)}
            title={t(`pillars.${pillar}.title`)}
            kicker={t(`pillars.${pillar}.sub`)}
            description={t(`pillars.${pillar}.description`)}
            onToolPress={(toolKey) => {
              const strategy = PILLAR_STRATEGIES[pillar].find((s) => s.key === toolKey);
              if (strategy?.route) router.push(strategy.route);
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
                tools={SHARED_TOOLS_BY_PILLAR[pillar]}
                tint={pillar}
                onOpenInfo={onOpenInfo}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
