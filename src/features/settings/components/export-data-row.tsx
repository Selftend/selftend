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
 * *"Everything you've written"* holds: `supabase/README.md:456` makes export the
 * default and withholding the exception, "it is app state" is explicitly refused
 * as a reason, and two gates keep it honest (`export-user-data-monotonic` in
 * `verify`, plus the completeness integration test). Nothing a person AUTHORED
 * is withheld — the withhold table is caller scoping, credentials and their row
 * ids, storage plumbing, server bookkeeping, and the encrypted `*_data` twins
 * that are read back through decrypting views.
 *
 * ⚠️ Two edges, both accepted deliberately rather than papered over:
 *
 *   - *"One JSON file"* is exact on web (a `.json` download) and loose on
 *     native, where the same JSON leaves through `Share.share({ message })` and
 *     no file exists at all. The CONTENTS promise — the part the sentence is
 *     really making — holds on both, and a person reading a settings row thinks
 *     in files.
 *   - An UNSAVED wizard draft (`selftend:wizard-draft:*`, AsyncStorage only)
 *     never reaches the export. "Everything you've written" reads as saved
 *     records to any reasonable user, but the gap is real and recorded here.
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
