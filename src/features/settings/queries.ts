import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ButtonTourKey, UserPreferences } from "@/src/features/modules/types";
import {
  deleteUserAccount,
  exportUserData,
  getUserPreferences,
  recordPolicyConsent,
  updateOnboardingPreferences,
  updateShownButtonTours,
  updateUserPreferences,
} from "@/src/features/settings/repository";

export const preferenceKeys = {
  detail: (userId: string) => ["preferences", userId] as const,
};

export function useUserPreferences(userId: string | null) {
  return useQuery({
    queryKey: userId ? preferenceKeys.detail(userId) : ["preferences", "anonymous"],
    queryFn: () => getUserPreferences(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpdateUserPreferences(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UserPreferences) => updateUserPreferences(userId!, preferences),
    // updateUserPreferences writes the WHOLE ~80-column row, and callers build it with
    // mergeUserPreferences(cachedPrefs, patch). Optimistically write the new row into the
    // cache so a rapid follow-up save reads THIS value instead of the stale pre-save
    // snapshot (which would silently drop the first save's columns). Roll back on error;
    // reconcile with the server on settle.
    // Callers that surface errors (notification cards, meditation onboarding) show their own
    // toast; callers that don't (sounds-sheet, settings-sync) intentionally swallow errors.
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onMutate: async (preferences: UserPreferences) => {
      if (!userId) return {};
      await queryClient.cancelQueries({ queryKey: preferenceKeys.detail(userId) });
      const previous = queryClient.getQueryData<UserPreferences>(preferenceKeys.detail(userId));
      queryClient.setQueryData(preferenceKeys.detail(userId), preferences);
      return { previous };
    },
    onError: (_error, _preferences, context) => {
      if (userId && context && "previous" in context && context.previous !== undefined) {
        queryClient.setQueryData(preferenceKeys.detail(userId), context.previous);
      }
    },
    onSettled: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
    },
  });
}

export function useUpdateShownButtonTours(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shownButtonTours: ButtonTourKey[]) =>
      updateShownButtonTours(userId!, shownButtonTours),
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
    },
  });
}

export function useUpdateOnboardingPreferences(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Parameters<typeof updateOnboardingPreferences>[1]) =>
      updateOnboardingPreferences(userId!, patch),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
    },
  });
}

export function useRecordPolicyConsent(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (policyVersion: string) => recordPolicyConsent(userId!, policyVersion),
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
    },
  });
}

export function useDeleteUserAccount() {
  return useMutation({
    mutationFn: () => deleteUserAccount(),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
  });
}

export function useExportUserData() {
  return useMutation({
    mutationFn: () => exportUserData(),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
  });
}
