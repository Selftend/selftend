import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { authenticate, isBiometricAvailable } from "@/src/features/security/biometric";
import { useAppLockStore } from "@/src/features/security/app-lock-store";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * Biometric availability probe + auth-gated app-lock toggle.
 *
 * Native only, and the platform gate lives at `AppLockRow`'s MOUNT POINT (#982),
 * not here and not inside the row: a row that hides itself is still a child
 * element to `SettingsRun`, which would keep its hairline. A consequence worth
 * having - this hook and its biometric probe never run on web at all.
 */
export function useAppLock() {
  const { t } = useTranslation("settings");
  const showToast = useToastStore((s) => s.showToast);
  const enabled = useAppLockStore((s) => s.enabled);
  const setEnabled = useAppLockStore((s) => s.setEnabled);
  const hydrate = useAppLockStore((s) => s.hydrate);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate().catch(() => {});
    let active = true;
    void isBiometricAvailable()
      .then((result) => {
        if (active) {
          setAvailable(result);
        }
      })
      .catch(() => {
        if (active) {
          setAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [hydrate]);

  const canToggle = available === true && !busy;

  const toggle = async (next: boolean) => {
    // Both directions require a successful auth: turning ON so the user can't lock
    // themselves out, and turning OFF so a non-owner who picks up an unlocked-looking
    // session can't disable the protection. authenticate() keeps the passcode fallback
    // on (disableDeviceFallback:false), so requiring it to disable can't lock anyone out.
    setBusy(true);
    try {
      const confirmed = await authenticate(t("security.appLockConfirm"));
      if (confirmed) {
        await setEnabled(next);
      }
    } catch {
      // setEnabled persists before flipping state, so the toggle stays consistent on a
      // failed write; just surface the error.
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return { enabled, available, canToggle, toggle };
}
