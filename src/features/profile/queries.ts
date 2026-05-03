import type { User } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getOrSyncUserProfile,
  removeUserAvatar,
  resetUserAvatarToOAuth,
  uploadUserAvatar,
  type AvatarUploadInput,
} from "@/src/features/profile/repository";

const profileKeys = {
  detail: (userId: string) => ["profile", userId] as const,
};

export function useUserProfile(user: User | null) {
  return useQuery({
    queryKey: user ? profileKeys.detail(user.id) : ["profile", "anonymous"],
    queryFn: () => getOrSyncUserProfile(user!),
    enabled: Boolean(user),
  });
}

export function useUploadUserAvatar(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<AvatarUploadInput, "userId">) =>
      uploadUserAvatar({
        userId: userId!,
        ...input,
      }),
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
    },
  });
}

export function useResetUserAvatarToOAuth(user: User | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (previousStoragePath?: string | null) =>
      resetUserAvatarToOAuth(user!, previousStoragePath),
    onSuccess: async () => {
      if (!user) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
    },
  });
}

export function useRemoveUserAvatar(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (previousStoragePath?: string | null) =>
      removeUserAvatar(userId!, previousStoragePath),
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
    },
  });
}

