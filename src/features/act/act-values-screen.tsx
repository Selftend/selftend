import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { Section } from "@/src/components/app/section";
import { LoadingState } from "@/src/components/app/screen-state";
import { ActValuesCheckIn } from "@/src/features/act/act-values-check-in";
import {
  useBullsEyeSnapshots,
  useLatestBullsEyeByDomain,
  useValueEntries,
} from "@/src/features/act/queries";
import { RelatedTools } from "@/src/features/act/related-tools";
import { ACT_LIFE_DOMAINS, type ACTLifeDomain } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useLocaleFormats } from "@/src/lib/locale-format";
import { cn } from "@/lib/utils";

/**
 * Drawn on `12b` and adopted NEUTRAL rather than in the module accent: four accented
 * glyphs down the left edge of four hairline rows would read as four states, and the
 * only state these rows carry is whether the value has been written yet - which the
 * trailing add/chevron already says.
 */
const DOMAIN_ICONS: Record<ACTLifeDomain, MaterialIconName> = {
  work: "work-outline",
  leisure: "sports-esports",
  relationships: "people-outline",
  personalGrowth: "self-improvement",
};

/**
 * The history window, newest first. A check-in writes four rows, so twelve is three
 * review dates - enough to read as a run without turning the screen into a log.
 */
const HISTORY_ROWS = 12;

/**
 * Values, with the alignment check-in folded in below them (#1379).
 *
 * The check-in used to live one push away at `/modules/act/values/bulls-eye`, and the
 * separation hid a contradiction: two controls wrote two answers to the same question
 * into two columns, and this screen read the one the check-in did not write. Rating a
 * value while reading it is also simply the flow - the question is "how aligned is my
 * life with THIS", and the value statement is the only thing that makes it answerable.
 */
export default function ActValuesScreen() {
  const { t } = useTranslation("act");
  const { formatDate } = useLocaleFormats();
  const { user } = useSession();
  const { data: entries, isLoading } = useValueEntries(user?.id ?? null);
  const { data: latestRatings } = useLatestBullsEyeByDomain(user?.id ?? null);
  const { data: snapshots } = useBullsEyeSnapshots(user?.id ?? null);

  const entryForDomain = (domain: ACTLifeDomain) =>
    entries?.find((e) => e.lifeDomain === domain) ?? null;

  /**
   * The check-in owns alignment, so its newest rating is the answer wherever one
   * exists. The entry's own column is no longer written - it stays on the table, and
   * this is the one place it is still read: a user who rated a domain in the old form
   * and has never done a check-in for it would otherwise watch their number disappear.
   * Genuinely two sources, in that order - not a fallback that can never be reached.
   */
  const alignmentFor = (domain: ACTLifeDomain): number | null =>
    latestRatings?.[domain] ?? entryForDomain(domain)?.currentAlignmentRating ?? null;

  const recentSnapshots = snapshots?.slice(0, HISTORY_ROWS) ?? [];

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <LoadingState title={t("values.listTitle")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("values.listTitle")} />
            <Text variant="muted">{t("values.listSubtitle")}</Text>
          </View>

          <Text variant="muted" className="text-xs">
            {t("values.domainIntro")}
          </Text>

          <RelatedTools
            tools={[{ icon: "edit-note", nameKey: "journal", href: "/tools/journal" }]}
          />

          <View>
            {ACT_LIFE_DOMAINS.map((domain) => (
              <DomainRow
                key={domain}
                domain={domain}
                valueStatement={entryForDomain(domain)?.valueStatement ?? ""}
                rating={alignmentFor(domain)}
              />
            ))}
          </View>

          <Section title={t("values.bullsEye.title")}>
            <ActValuesCheckIn />
          </Section>

          <Section title={t("values.bullsEye.historyTitle")}>
            <View testID="bulls-eye-history" className="gap-2">
              {recentSnapshots.length === 0 ? (
                <Text variant="muted">{t("values.bullsEye.noHistory")}</Text>
              ) : (
                recentSnapshots.map((snap) => (
                  <View
                    key={snap.id}
                    className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium">{t(`values.${snap.domain}`)}</Text>
                      <Text variant="muted" className="text-xs">
                        {formatDate(snap.reviewedAt)}
                      </Text>
                    </View>
                    <AlignmentPill rating={snap.alignmentRating} />
                  </View>
                ))
              )}
            </View>
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * A hairline row rather than a card: four bordered cards on a background read as four
 * competing panels, and the check-in below is already a section of its own.
 *
 * The alignment line sits INSIDE the text column at every width. Pulling it out to a
 * trailing column is what the 1080px mock does, and it is the shape that fails first
 * at 360dp - and a row that drops its chevron on a phone would be the third instance
 * of a treatment that differs by viewport.
 */
function DomainRow({
  domain,
  valueStatement,
  rating,
}: {
  domain: ACTLifeDomain;
  valueStatement: string;
  rating: number | null;
}) {
  const { t } = useTranslation("act");
  const hasEntry = Boolean(valueStatement);

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push({ pathname: "/modules/act/values/[domain]", params: { domain } })}
      className="flex-row items-center gap-4 border-t border-border py-4 active:bg-accent/40"
    >
      <Icon name={DOMAIN_ICONS[domain]} className="size-5 text-muted-foreground" />
      <View className="flex-1 gap-1">
        <Text className="font-semibold">{t(`values.${domain}`)}</Text>
        {hasEntry ? (
          <Text variant="muted" className="text-xs leading-snug" numberOfLines={2}>
            {valueStatement}
          </Text>
        ) : (
          <Text variant="muted" className="text-xs italic">
            {t("values.notSet")}
          </Text>
        )}
        {rating !== null ? (
          <View className="mt-1 flex-row items-center gap-2">
            <AlignmentBar rating={rating} />
            {/*
              One interpolated string, never a "Alignment" + "7/10" pair: split into two
              nodes it becomes an unorderable fragment for a translator, and the number
              does not follow the noun in every language.
            */}
            <Text className="text-xs text-foreground">
              {t("values.alignmentLabel", { rating })}
            </Text>
          </View>
        ) : null}
      </View>
      <Icon
        name={hasEntry ? "chevron-right" : "add"}
        className={cn("size-4", hasEntry ? "text-muted-foreground" : "text-primary")}
      />
    </Pressable>
  );
}

function AlignmentBar({ rating }: { rating: number }) {
  return (
    <View className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${(rating / 10) * 100}%` }}
      />
    </View>
  );
}

function AlignmentPill({ rating }: { rating: number }) {
  return (
    <View className="items-center justify-center rounded-full bg-muted px-3 py-1">
      <Text className="text-sm font-bold text-foreground">{rating}/10</Text>
    </View>
  );
}
