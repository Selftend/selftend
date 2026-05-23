import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ButtonTourKey, ModuleKey, UserPreferences } from "@/src/features/modules/types";
import {
  deleteUserAccount,
  exportUserData,
  getUserPreferences,
  recordPolicyConsent,
  updateEnabledModules,
  updateOnboardingPreferences,
  updateShownButtonTours,
  updateUserPreferences,
} from "@/src/features/settings/repository";

const preferenceKeys = {
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
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
    },
  });
}

export function useUpdateEnabledModules(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabledModules: ModuleKey[]) => updateEnabledModules(userId!, enabledModules),
    onSuccess: async () => {
      if (!userId) {
        return;
      }

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
  });
}

export function useExportUserData() {
  return useMutation({
    mutationFn: () => exportUserData(),
  });
}
