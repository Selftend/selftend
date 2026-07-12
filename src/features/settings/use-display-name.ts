import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { UserProfile } from "@/src/features/profile/profile-sync";
import { useUpdateUserDisplayName } from "@/src/features/profile/queries";
import { getErrorMessage } from "@/src/utils/error-message";

/**
 * Display-name field state + save handler, extracted verbatim from
 * `ProfilePictureCard`. The effect keeps the input seeded from the loaded
 * profile; `save` writes through the mutation and surfaces a localized message
 * or error.
 */
export function useDisplayName(userId: string | null, profile: UserProfile | null | undefined) {
  const { t } = useTranslation("settings");
  const updateNameMutation = useUpdateUserDisplayName(userId);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(profile?.displayName ?? "");
  }, [profile?.displayName]);

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
