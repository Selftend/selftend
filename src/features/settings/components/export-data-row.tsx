import { useTranslation } from "react-i18next";

import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { useExportData } from "@/src/features/settings/use-export-data";

/**
 * `Export my data`, as a row that acts in place.
 *
 * The two permanent `Text` nodes this used to grow beneath itself - one for
 * success, one for failure - are gone with the rest of the R7 banner pair. An
 * export is a transient outcome: it either produced a file or it did not, and
 * neither answer is a state the page has to keep displaying. The spinner in the
 * trailing slot is the part that persists, and only while the request does.
 *
 * ✅ The description's promise was CHECKED, not assumed (#1831) — this page has
 * rejected drawn copy four times for describing behaviour that does not exist.
 * *"Everything you've written"* is true: `supabase/README.md` makes export the
 * default and withholding the exception, every withheld entry is a credential,
 * an id or an encrypted twin, and a completeness test holds that line.
 *
 * ⚠️ *"One JSON file"* is exact on web (a `.json` download) and loose on native,
 * where the same JSON leaves through a share sheet. The CONTENTS promise holds
 * on both; only the word "file" is approximate, and a person reading a settings
 * row thinks in files. Taken deliberately.
 */
export function ExportDataRow() {
  const { t } = useTranslation("settings");
  const { exportData, isPending } = useExportData();

  return (
    <SettingsRow
      icon="download"
      label={t("account.exportButton")}
      description={t("account.exportDescription")}
      trailing={{ kind: "act" }}
      pending={isPending}
      pendingLabel={t("account.exporting")}
      onPress={() => void exportData()}
      testID="settings-row-export"
    />
  );
}
