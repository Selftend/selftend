import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { useAppLock } from "@/src/features/settings/use-app-lock";

/**
 * The whole of what `SecuritySection` was: one switch.
 *
 * The card it lived in also carried `How we protect your data`, a link to
 * `/security`. That pairing had nothing behind it - `app/privacy.tsx:21` already
 * links `/security` on every platform, so with `Privacy` as a row the chain reads
 * Settings → Privacy → the document, and the card was covering a device lock and
 * a policy page in one box.
 *
 * Native only. On web the app relies on the browser session plus sign-out, and
 * there is no biometric prompt to gate anything with.
 */
export function AppLockRow() {
  const { t } = useTranslation("settings");
  const { enabled, available, canToggle, toggle } = useAppLock();

  if (Platform.OS === "web") {
    return null;
  }

  return (
    <SettingsRow
      icon="lock"
      label={t("security.appLock")}
      // A state that persists is shown where it lives. A device with no
      // biometrics and no passcode stays that way after a toast has faded, so
      // `appLockUnavailable` is the row's own second line.
      description={
        available === false ? t("security.appLockUnavailable") : t("security.appLockDescription")
      }
      trailing={{
        kind: "switch",
        checked: enabled,
        disabled: !canToggle,
        onCheckedChange: (next) => void toggle(next),
      }}
      testID="settings-row-app-lock"
    />
  );
}
