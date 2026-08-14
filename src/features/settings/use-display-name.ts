import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { UserProfile } from "@/src/features/profile/profile-sync";
import { useUpdateUserDisplayName } from "@/src/features/profile/queries";
import { getErrorMessage } from "@/src/utils/error-message";

/**
 * Display-name field state + save handler, extracted verbatim from
 * `SettingsProfileBlock`. The input stays seeded from the loaded profile via a
 * render-time adjustment; `save` writes through the mutation and surfaces a
 * localized message or error.
 */
export function useDisplayName(userId: string | null, profile: UserProfile | null | undefined) {
  const { t } = useTranslation("settings");
  const updateNameMutation = useUpdateUserDisplayName(userId);
  const displayName = profile?.displayName ?? "";
  const [value, setValue] = useState(displayName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Re-seed the field whenever the loaded profile's name changes (initial
  // load included), without clobbering unrelated in-progress edits.
  const [prevDisplayName, setPrevDisplayName] = useState(displayName);
  if (displayName !== prevDisplayName) {
    setPrevDisplayName(displayName);
    setValue(displayName);
  }

  const save = async () => {
    try {
      setMessage("");
      setError("");
      await updateNameMutation.mutateAsync(value);
      setMessage(t("profile.nameSaved"));
    } catch (nameErr) {
      setError(getErrorMessage(nameErr, t("profile.nameError")));
    }
  };

  return {
    value,
    setValue,
    save,
    isPending: updateNameMutation.isPending,
    message,
    error,
  };
}
