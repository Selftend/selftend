import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import i18n from "@/src/i18n";
import { favoriteId, type Favorite, type FavoriteKind } from "@/src/features/favorites/items";
import { addFavorite, listFavorites, removeFavorite } from "@/src/features/favorites/repository";
import { useToastStore } from "@/src/stores/toast-store";

export const favoriteKeys = {
  all: ["favorites"] as const,
  list: (userId: string) => ["favorites", "list", userId] as const,
  toggle: ["favorites", "toggle"] as const,
};

/**
 * The person's starred tools and modules. `undefined` means NOT LOADED — and every
 * surface reading this draws nothing for that state (no star, no empty line), because a
 * hollow star claims "not favourited" and an empty line claims "you have none". Neither
 * is a claim a loading surface may make.
 *
 * ☠️ Not an edge case: `createQueryPersister` returns `null` on web, so web cold-loads
 * this on every visit.
 */
export function useFavorites(userId: string | null) {
  return useQuery({
    queryKey: userId ? favoriteKeys.list(userId) : ["favorites", "list", "anonymous"],
    queryFn: () => listFavorites(userId!),
    enabled: Boolean(userId),
  });
}

interface ToggleContext {
  previous: Favorite[] | undefined;
}

/**
 * The star (#1888, #1955): optimistic with rollback, and therefore no pending state — a
 * disabled star would block the undo press.
 *
 * One hook per card, because the SCOPE is per item: `scope.id` is the thing that closes
 * the star→unstar→star race. The mutation cache admits one pending mutation per scope
 * and resumes the rest in insertion order, so a burst of presses lands in press order;
 * and `onMutate` runs before the retryer is awaited, so the optimistic flip still fires
 * instantly on a queued mutation. Verified against the installed query-core (#1889).
 * That serialises ONE client session; two devices stay last-writer-wins.
 *
 * ☠️☠️ The rollback and the toast live HERE, in the hook's own `onError`, never in
 * `mutate(vars, { onError })`. Pressing the card navigates, so the caller unmounts and a
 * call-site callback is dropped — leaving the optimistic lie in cache with no toast. A
 * hook-level callback is stored on the mutation itself and survives the unmount.
 *
 * The toast is title-only: the global one's description ("Your changes are still on this
 * screen") is false once the star has rolled back. `networkMode: "always"` (the app
 * default) means an offline press fails fast here rather than queueing. No success toast
 * — eleven in a row after migration would be the engagement mechanic ADR-0004 refuses.
 */
export function useToggleFavorite(userId: string | null, kind: FavoriteKind, key: string) {
  const queryClient = useQueryClient();
  const listKey = userId ? favoriteKeys.list(userId) : null;

  return useMutation<void, Error, boolean, ToggleContext>({
    mutationKey: favoriteKeys.toggle,
    scope: { id: favoriteId(kind, key) },
    meta: { suppressGlobalErrorToast: true },
    mutationFn: (favorite) =>
      favorite ? addFavorite(userId!, kind, key) : removeFavorite(userId!, kind, key),
    onMutate: async (favorite) => {
      if (!listKey) return { previous: undefined };
      // A refetch landing between the flip and the settle would overwrite the flip.
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Favorite[]>(listKey);
      queryClient.setQueryData<Favorite[]>(listKey, (old) => {
        const without = (old ?? []).filter((f) => !(f.kind === kind && f.key === key));
        return favorite ? [...without, { kind, key }] : without;
      });
      return { previous };
    },
    onError: (_error, _favorite, context) => {
      if (listKey && context) {
        queryClient.setQueryData(listKey, context.previous);
      }
      useToastStore.getState().showToast({
        title: i18n.t("errors:saveFailed.title"),
        tone: "error",
      });
    },
    onSettled: () => {
      if (!listKey) return;
      // Only once the whole burst has landed: invalidating after the FIRST of three
      // queued presses would refetch a server state the next two have not reached yet
      // and wipe their optimistic flips for a beat.
      if (queryClient.isMutating({ mutationKey: favoriteKeys.toggle }) > 1) return;
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}
