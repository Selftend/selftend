import { type Href } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Section } from "@/src/components/app/section";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { ThoughtRecordRow } from "@/src/features/cbt/thought-record-row";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

interface RecentThoughtRecordsProps {
  records: ThoughtRecord[];
  ruled: boolean;
}

/**
 * The overview's recent records (#1386).
 *
 * Three rows, not one - the section used to render a single record while ACT's
 * home already showed three, and one row is a sample rather than a list.
 *
 * ☠️ **This is the screen's only door to the record history.** There used to be
 * three renderings of one fact: this section, a "Record history" row pinned to
 * the foot of the page, and (with #1387) a header stat carrying the count. The
 * foot row and this section were the same door twice in the same register, so
 * the foot row became this section's action. The header stat is a different
 * register - a count, not a door - and keeps its number.
 */
export function RecentThoughtRecords({ records, ruled }: RecentThoughtRecordsProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");

  if (records.length === 0) {
    return null;
  }

  return (
    <Section
      ruled={ruled}
      title={t("dashboard.recentThought")}
      action={<ShowAllLink label={t("home.showAllRecords")} route="/modules/cbt/history" />}
    >
      <View>
        {records.map((record) => (
          <ThoughtRecordRow
            key={record.id}
            record={record}
            onPress={() => pushWithOrigin(`/modules/cbt/history/${record.id}` as Href)}
          />
        ))}
      </View>
    </Section>
  );
}
