import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { HairlineRow } from "@/src/components/app/hairline-row";
import type { DefusionLog } from "@/src/features/act/types";
import { formatTimestamp } from "@/src/utils/date";

interface DefusionLogRowProps {
  log: DefusionLog;
  onPress: () => void;
}

/**
 * One defusion log as a hairline row (#1388). Used by ACT home's recent logs
 * AND by the full log list behind its door - converting only one of them would
 * change the shape of what a user is reading mid-journey, the same reasoning
 * that put CBT's `ThoughtRecordRow` on both of its screens.
 *
 * The meta line names the **technique, not the category**: two logs in the same
 * category are told apart by how the user worked with them, and the category is
 * on the detail screen for whoever wants it.
 *
 * `before → after` sits ON the meta line, never as a third column - three
 * columns leave roughly 230dp for a two-line thought at 360dp. The `after`
 * numeral is the row's one accent use, permitted as a value being read back
 * rather than decoration (#1221); everything else stays neutral. The pair is
 * omitted when either number is null, matching the gate both screens already
 * applied.
 *
 * ⚠️ The timestamp stays **absolute** (`formatTimestamp`). The drawn relative
 * form would need `formatRelativeActivity`, which the captured-frame lint gate
 * restricts to last-updated timestamps - this is a creation timestamp.
 *
 * ☠️ Through `HairlineRow`, the row carries **no explicit accessible name**:
 * its children are the name, which is what keeps the pair and the timestamp
 * audible to assistive tech on the web. That fact is also why the shared
 * card-link component could not take this row - its `description` becomes an
 * `accessibilityHint` react-native-web never implements, and its explicit label
 * would silence everything below the title.
 */
export function DefusionLogRow({ log, onPress }: DefusionLogRowProps) {
  const { t } = useTranslation("act");

  const hasFusionPair = log.fusionLevelBefore !== null && log.fusionLevelAfter !== null;

  return (
    <HairlineRow
      title={log.fusedThought}
      onPress={onPress}
      meta={
        <Fragment>
          <Text variant="muted" className="text-xs">
            {t(`defusion.techniques.${log.techniqueUsed}`)}
          </Text>
          {hasFusionPair ? (
            // Bare numerals, no words - the shipped form on both screens, so
            // there is nothing here for a translator to reorder. Nested so the
            // pair reads as one text run while only the after numeral takes
            // the accent.
            <Text className="text-xs text-foreground">
              {`${log.fusionLevelBefore} → `}
              <Text className="text-xs font-semibold text-primary-ink">{log.fusionLevelAfter}</Text>
            </Text>
          ) : null}
          <Text variant="muted" className="text-xs">
            {formatTimestamp(log.createdAt)}
          </Text>
        </Fragment>
      }
    />
  );
}
