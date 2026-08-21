import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { NumberRating } from "@/src/components/app/number-rating";
import { useSaveBullsEyeSnapshot } from "@/src/features/act/queries";
import { ACT_LIFE_DOMAINS, type ACTLifeDomain } from "@/src/features/act/types";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import {
  useActValuesCheckInDraftStore,
  type ActValuesCheckInDraft,
} from "@/src/stores/act-values-check-in-draft-store";
import { useToastStore } from "@/src/stores/toast-store";

const EMPTY_RATINGS: ActValuesCheckInDraft = {
  work: null,
  leisure: null,
  relationships: null,
  personalGrowth: null,
};

/**
 * The alignment check-in, on the same screen as the values it rates (#1379).
 *
 * It is the ONE control that answers "how aligned is my life with this value?". The
 * domain form used to ask the same question with its own rating, writing a second
 * answer to a second column while the row above preferred that one - so a user who
 * saved a check-in watched the number 200px above it stay where it was. Two routes hid
 * the disagreement; folding them together made it unmissable, and the check-in won
 * because it is the surface that carries a history.
 *
 * Always open, and its Save sits inline at the end of the section rather than in a
 * pinned footer: the screen's own subject is the values above, and a footer bar
 * following the user down a page of reading would claim the screen for the check-in.
 */
export function ActValuesCheckIn() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const saveMutation = useSaveBullsEyeSnapshot(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const ratings = useActValuesCheckInDraftStore((state) => state.values) ?? EMPTY_RATINGS;
  const hydrateDraft = useActValuesCheckInDraftStore((state) => state.hydrate);
  const resetDraft = useActValuesCheckInDraftStore((state) => state.reset);
  const setDraftValues = useActValuesCheckInDraftStore((state) => state.setValues);

  // Domains whose save rejected on the last attempt. While non-empty, the save
  // button retries ONLY these - the fulfilled ones are already on the server and
  // must not be duplicated. Deliberately NOT in the draft store: a failure belongs
  // to one attempt, and carrying it across a remount would re-accuse a domain the
  // user may since have saved elsewhere.
  const [failedDomains, setFailedDomains] = useState<ACTLifeDomain[]>([]);

  useEffect(() => {
    hydrateDraft();
  }, [hydrateDraft]);

  function setRating(domain: ACTLifeDomain, value: number | null) {
    setDraftValues({ ...ratings, [domain]: value });
  }

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    const candidates = failedDomains.length > 0 ? failedDomains : ACT_LIFE_DOMAINS;
    const domainsToSave = candidates.filter((d) => ratings[d] !== null);
    if (domainsToSave.length === 0) return;
    // allSettled (not Promise.all) so one rejected domain doesn't hide the fate
    // of the others: fulfilled ones are saved for real, and only the rejected
    // ones stay queued for retry.
    const results = await Promise.allSettled(
      domainsToSave.map((domain) =>
        saveMutation.mutateAsync({ domain, alignmentRating: ratings[domain]! }),
      ),
    );
    const failed = domainsToSave.filter((_, index) => results[index].status === "rejected");
    setFailedDomains(failed);
    if (failed.length > 0) return; // keep the ratings on screen; the card lists them

    showToast({ title: t("values.bullsEye.savedToast"), tone: "success" });
    // The check-in is done and its numbers are now on the rows above, read back from
    // the server. Clearing returns it to a fresh check-in rather than leaving four
    // saved ratings looking like unsaved work.
    resetDraft();
  });

  const anyRated = ACT_LIFE_DOMAINS.some((d) => ratings[d] !== null);

  return (
    <View className="gap-6">
      <Text variant="muted" className="text-xs">
        {t("values.bullsEye.subtitle")}
      </Text>

      <View className="gap-6">
        {ACT_LIFE_DOMAINS.map((domain) => (
          <View key={domain} className="gap-3">
            <Label>{t(`values.${domain}`)}</Label>
            <NumberRating
              min={1}
              max={10}
              step={1}
              value={ratings[domain]}
              onChange={(v) => setRating(domain, v)}
            />
          </View>
        ))}
      </View>

      {failedDomains.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("values.bullsEye.saveProblem")}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-1">
              {failedDomains.map((domain) => (
                <Text key={domain} variant="muted">
                  {t(`values.${domain}`)}
                </Text>
              ))}
            </View>
          </CardContent>
        </Card>
      ) : null}

      <Button disabled={saveMutation.isPending || !anyRated} onPress={() => void handleSave()}>
        {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
        <Text>
          {saveMutation.isPending ? t("values.bullsEye.saving") : t("values.bullsEye.saveAll")}
        </Text>
      </Button>
    </View>
  );
}
