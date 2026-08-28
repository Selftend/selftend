import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ActDetailLoading, ActDetailNotFound } from "@/src/features/act/act-detail-scaffold";
import { useUrgeSurfLog, useUrgeSurfLogPages } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";
import { useLocaleFormats } from "@/src/lib/locale-format";

/**
 * One urge-surf entry, read back whole — the route #1517 adds.
 *
 * ☠️ **This screen is the larger half of urge surf's defect, and the reason it is in
 * #1517's coverage at all.** The four-step form asks for `urgeDescription`, `trigger`,
 * `peakIntensity`, `urgeActedOn` and `surfingNotes`. Before this route the ONLY surface
 * rendering any of it showed two of those six fields — the description and a timestamp —
 * so a user who finished the flow and opened the screen five seconds later saw two of
 * their own six answers, and the other four were readable by nobody, at any depth,
 * forever. The unreachable sixth-oldest ENTRY was the smaller problem; ACT asking four
 * questions and showing the answers to no one was the bigger one.
 *
 * Reuses the form's own labels as card titles rather than inventing detail-only copy —
 * the house convention (`act-expansion-detail-screen.tsx` titles its cards with
 * `expansion.bodyLabel` and the rest), and it keeps the question a user answered next to
 * the answer they gave.
 *
 * ⚠️ No delete control, deliberately: `repository/urge-surf.ts` exports no delete, unlike
 * the five feeds whose detail screens offer one. Adding one is a write-path change, not a
 * reachability change, so it is out of #1517's scope — the unused `urgeSurf.delete*` keys
 * already in `act.json` are where it would start.
 */
export default function ActUrgeSurfDetailScreen() {
  const { t } = useTranslation("act");
  const { formatDateTime } = useLocaleFormats();
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = typeof id === "string" ? id : null;

  // Read the loaded archive pages first so tapping a row paints instantly; the
  // single-row fetch is the cold-load path (a shared URL, or a deep link).
  const { data: pageData } = useUrgeSurfLogPages(user?.id ?? null);
  const fromCache = logId
    ? (pageData?.pages.flat().find((entry) => entry.id === logId) ?? null)
    : null;
  const { data: fetched, isLoading } = useUrgeSurfLog(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : logId,
  );
  const log = fromCache ?? fetched ?? null;

  if (!fromCache && isLoading) {
    return <ActDetailLoading title={t("expansion.urgeSurfTitle")} />;
  }

  if (!log) {
    return (
      <ActDetailNotFound title={t("expansion.urgeSurfTitle")} message={t("expansion.noUrgeLogs")} />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={log.urgeDescription} />
            <Text variant="muted">{formatDateTime(log.createdAt)}</Text>
          </View>

          {log.trigger ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.urgeSurf.triggerLabel")}</CardTitle>
                <CardDescription>{log.trigger}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {log.peakIntensity !== null ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.urgeSurf.peakLabel")}</CardTitle>
                <CardDescription>{log.peakIntensity} / 100</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {/*
            Always rendered, unlike the optional fields above: `urgeActedOn` is a boolean
            the form always writes, and `false` is the answer a user most wants to read
            back. Gating it on truthiness would hide exactly the entries where surfing
            worked.
          */}
          <Card>
            <CardHeader>
              <CardTitle>{t("expansion.urgeSurf.actedOnLabel")}</CardTitle>
              <CardDescription>
                {log.urgeActedOn
                  ? t("expansion.urgeSurf.actedOnYes")
                  : t("expansion.urgeSurf.actedOnNo")}
              </CardDescription>
            </CardHeader>
          </Card>

          {log.surfingNotes ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("expansion.urgeSurf.notesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{log.surfingNotes}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
