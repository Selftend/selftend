import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  mergeUserPreferences,
  type ButtonTourKey,
  type UserPreferences,
} from "@/src/features/modules/types";
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
    // Callers pass ONLY the fields they change; the repository writes only those
    // columns (#57 - a whole-row write clobbers concurrent writers with values
    // captured at mount). Optimistically merge the patch into the cached row so a
    // rapid follow-up save reads THIS value instead of the stale pre-save snapshot.
    // Roll back on error; reconcile with the server on success.
    // Callers that surface errors (notification cards, meditation onboarding) show their own
    // toast; callers that don't (sounds-sheet, settings-sync) intentionally swallow errors.
    mutationFn: (patch: Partial<UserPreferences>) => updateUserPreferences(userId!, patch),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onMutate: async (patch: Partial<UserPreferences>) => {
      if (!userId) return {};
      await queryClient.cancelQueries({ queryKey: preferenceKeys.detail(userId) });
      const previous = queryClient.getQueryData<UserPreferences>(preferenceKeys.detail(userId));
      queryClient.setQueryData(
        preferenceKeys.detail(userId),
        mergeUserPreferences(previous, patch),
      );
      return { previous };
    },
    onError: (_error, _preferences, context) => {
      if (userId && context && "previous" in context && context.previous !== undefined) {
        queryClient.setQueryData(preferenceKeys.detail(userId), context.previous);
      }
    },
    // Reconcile with the server on SUCCESS ONLY - never after a failure. Invalidating
    // after a failed push refetches preferences, which hands settings-sync a "fresh"
    // preferences object whose values still differ from local, which re-triggers the
    // push, which fails again... an infinite upsert loop (observed as endless 409s
    // when a still-valid JWT belongs to a deleted user). On error the onMutate
    // rollback above already restored the cache.
    onSuccess: async () => {
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
    // Both callers treat tour-seen writes as best-effort; a failure must stay invisible.
    meta: { suppressGlobalErrorToast: true },
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
