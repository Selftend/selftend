import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { type Href } from "expo-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { SharedToolsRow, type SharedTool } from "@/src/components/app/shared-tools-row";
import { TechniqueCaution } from "@/src/components/app/technique-caution";
import { FORM_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";
import { type DbtGroupKey } from "@/src/features/dbt/dbt-home-config";

/**
 * One skill group's learn page, at `/modules/dbt/learn/[group]` (spec §8.5):
 * the reading the module keeps of that group's chapters, including every
 * exercise from those chapters the module deliberately does not build.
 *
 * Static text on the CBT learn page's card shape. Nothing records, nothing
 * varies by day or by visit, and nothing branches on anything the person has
 * entered.
 *
 * ⚠️ `CrisisSupportBar` on EVERY learn page is a deliberate departure from the
 * sibling learn surfaces (CBT's distortion guide has none; ACT teaches through
 * a modal). It is argued by the content: these pages carry the abuse-boundary
 * line and the four professional referrals, and a page that names those doors
 * should carry the app's own door beside them.
 */

/** A cross-link a learn section can offer. The label lives in the `dbt` namespace. */
const LEARN_LINKS: Record<string, { route: Href; icon: MaterialIconName }> = {
  coldWater: {
    route: { pathname: "/tools/grounding/[slug]", params: { slug: "cold-water" } },
    icon: "ac-unit",
  },
  breathing: { route: "/tools/breathing", icon: "air" },
  habits: { route: "/tools/habits", icon: "task-alt" },
  meditation: { route: "/tools/meditation", icon: "self-improvement" },
  meditationPractices: { route: "/tools/meditation/practices", icon: "spa" },
  journal: { route: "/tools/journal", icon: "edit-note" },
  checkIn: { route: "/tools/check-in", icon: "mood" },
  sleep: { route: "/tools/sleep", icon: "bedtime" },
  grounding: { route: "/tools/grounding", icon: "anchor" },
  cbtActivities: { route: "/modules/cbt/activities", icon: "directions-run" },
  cbtBeliefs: { route: "/modules/cbt/beliefs", icon: "anchor" },
  cbtThoughtRecord: { route: "/modules/cbt/new", icon: "article" },
  cbtWorry: { route: "/modules/cbt/worry", icon: "psychology" },
  // ⚠️ A chip into another MODULE is new - every shipped `SharedToolsRow` chip
  // roots under `/tools`. It is a stated departure, not an oversight: the row's
  // Up-climb trade holds for a module route too, and these four rows are where
  // the workbook's own material already lives in the app.
  actDefusion: { route: "/modules/act/defusion", icon: "filter-drama" },
  actExpansion: { route: "/modules/act/expansion", icon: "open-in-full" },
  actValues: { route: "/modules/act/values", icon: "explore" },
  actDropAnchor: { route: "/modules/act/connection/drop-anchor", icon: "anchor" },
  actCommittedAction: { route: "/modules/act/committed-action", icon: "directions-run" },
  actConnection: { route: "/modules/act/connection", icon: "radio-button-checked" },
};

/** One block of a group page, as authored in the locale files. */
interface LearnSection {
  title: string;
  paragraphs: string[];
  items?: string[];
  links?: string[];
  /** The lead-in above a run of technique cautions. */
  caution?: string;
  /** Cautions rendered through `TechniqueCaution` - told, never asked, never stored. */
  cautions?: string[];
}

function linkTools(keys: string[] | undefined, groupKey: string, index: number): SharedTool[] {
  return (keys ?? [])
    .filter((key) => LEARN_LINKS[key] !== undefined)
    .map((key) => ({
      key: `${groupKey}-${index}-${key}`,
      route: LEARN_LINKS[key].route,
      icon: LEARN_LINKS[key].icon,
      labelKey: `dbt:learn.links.${key}`,
    }));
}

interface DbtLearnGroupScreenProps {
  groupKey: DbtGroupKey;
}

export default function DbtLearnGroupScreen({ groupKey }: DbtLearnGroupScreenProps) {
  const { t } = useTranslation("dbt");
  // Structured content as a JSON array, read with `returnObjects` - the
  // convention for policy sections, grounding steps and meditation
  // instructions, rather than a run of numbered keys.
  const sections = t(`learn.groups.${groupKey}.sections`, {
    returnObjects: true,
  }) as unknown as LearnSection[];
  const blocks = Array.isArray(sections) ? sections : [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-6")}>
          <View className="gap-2">
            <ScreenHeader title={t(`groups.${groupKey}.name`)} />
            <Text variant="muted">{t(`learn.groups.${groupKey}.intro`)}</Text>
          </View>

          <CrisisSupportBar />

          {blocks.map((section, index) => (
            <Card key={`${groupKey}-${index}`}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <CardDescription key={paragraphIndex}>{paragraph}</CardDescription>
                ))}
              </CardHeader>
              {section.items || section.cautions || section.links ? (
                <CardContent className="gap-3">
                  {section.items ? (
                    <View className="gap-1.5">
                      {section.items.map((item, itemIndex) => (
                        <View key={itemIndex} className="flex-row gap-2">
                          <Text variant="muted" className="text-sm leading-snug">
                            ·
                          </Text>
                          <Text variant="muted" className="flex-1 text-sm leading-snug">
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {section.cautions ? (
                    <View className="gap-2">
                      {section.caution ? (
                        <Text variant="muted" className="text-sm leading-snug">
                          {section.caution}
                        </Text>
                      ) : null}
                      {/* Always visible, never a modal, never dismissed, never
                          acknowledged, never stored - and the app never asks
                          whether any of it applies (spec §9, S5). */}
                      {section.cautions.map((caution, cautionIndex) => (
                        <TechniqueCaution key={cautionIndex} lines={[caution]} />
                      ))}
                    </View>
                  ) : null}

                  {section.links && section.links.length > 0 ? (
                    <SharedToolsRow
                      heading={t("learn.linksLabel")}
                      tools={linkTools(section.links, groupKey, index)}
                    />
                  ) : null}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
