import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { favoriteScopeId, type FavoriteKind } from "@/src/features/favorites/items";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  type Favorite,
} from "@/src/features/favorites/repository";
import i18n from "@/src/i18n";
import { useToastStore } from "@/src/stores/toast-store";

export const favoriteKeys = {
  all: ["favorites"] as const,
  list: (userId: string) => ["favorites", "list", userId] as const,
  /** Every star write for one user, so `isMutating` can count the ones still in flight. */
  set: (userId: string) => ["favorites", "set", userId] as const,
};

/**
 * The person's starred items. Guests need nothing special: an anonymous session has a
 * real `auth.uid()`, and the table's policy is `to authenticated`.
 *
 * ☠️ `undefined` is "not loaded", and the card draws NO star for it - not a hollow one,
 * which would claim "not favourited". That is not an edge case: the query persister
 * returns `null` on web, so web cold-loads this on every visit.
 */
export function useFavorites(userId: string | null) {
  return useQuery({
    queryKey: userId ? favoriteKeys.list(userId) : ["favorites", "list", "anonymous"],
    queryFn: () => listFavorites(userId!),
    enabled: Boolean(userId),
  });
}

/** `undefined` until the list has loaded; then whether this exact (kind, key) is starred. */
export function isFavorite(
  favorites: Favorite[] | undefined,
  kind: FavoriteKind,
  key: string,
): boolean | undefined {
  if (favorites === undefined) return undefined;
  return favorites.some((favorite) => favorite.kind === kind && favorite.key === key);
}

function applyFlip(favorites: Favorite[], kind: FavoriteKind, key: string, favorite: boolean) {
  const without = favorites.filter((row) => !(row.kind === kind && row.key === key));
  return favorite ? [...without, { kind, key }] : without;
}

/**
 * Title-only, deliberately: `errors:saveFailed.description` says "Your changes are still
 * on this screen", which is false once the star has rolled back. Fired from the mutation's
 * own `onError` rather than the caller's, and the global fallback is suppressed so it does
 * not fire a second, wrong one.
 */
function showStarFailedToast(): void {
  useToastStore.getState().showToast({
    title: i18n.t("errors:saveFailed.title"),
    tone: "error",
  });
}

/**
 * The star's write: `true` stars the item, `false` unstars it. One hook per card, because
 * the mutation `scope` is per (kind, key) and TanStack takes it as a hook option.
 *
 * Optimistic with rollback, and therefore NO pending state - a disabled star would block
 * the undo press. The optimistic flip happens in `onMutate`, which runs before the
 * retryer is awaited, so a press queued behind another in the same scope still flips
 * instantly.
 *
 * ☠️☠️ The rollback and the error toast live HERE, in the mutation's own `onError`,
 * never in `mutate(id, { onError })`. Pressing the card navigates, so the caller
 * unmounts, and `MutationObserver` drops a call-site callback once it has no listener -
 * the optimistic lie would stay in cache with no toast at all.
 *
 * ☠️☠️ The add/remove race closes with `scope`, not SQL: the mutation cache admits one
 * pending mutation per scope and resumes the rest in insertion order, so a fast
 * star → unstar → star lands in press order on this client. Two devices stay
 * last-writer-wins.
 */
export function useSetFavorite(userId: string | null, kind: FavoriteKind, key: string) {
  const queryClient = useQueryClient();
  const listKey = userId
    ? favoriteKeys.list(userId)
    : (["favorites", "list", "anonymous"] as const);
  const setKey = favoriteKeys.set(userId ?? "anonymous");

  return useMutation({
    mutationKey: setKey,
    scope: { id: favoriteScopeId(kind, key) },
    // An offline press fails fast and never queues (the app client already defaults to
    // this; restated so the contract is in the module that relies on it).
    networkMode: "always",
    meta: { suppressGlobalErrorToast: true },
    mutationFn: (favorite: boolean) =>
      favorite ? addFavorite(userId!, kind, key) : removeFavorite(userId!, kind, key),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Favorite[]>(listKey);
      // An unloaded list is left unloaded: nothing draws a star before the list is in,
      // so there is nothing to flip, and the updater returning `undefined` is a no-op.
      queryClient.setQueryData<Favorite[]>(listKey, (old) =>
        old === undefined ? undefined : applyFlip(old, kind, key, favorite),
      );
      return { previous };
    },
    onError: (_error, _favorite, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(listKey, context.previous);
      showStarFailedToast();
    },
    onSettled: () => {
      // Refetch only once the LAST write in this user's queue settles. Invalidating after
      // an earlier one would refetch the server's intermediate state over a later press's
      // optimistic flip, and the star would flicker back on the way to the truth.
      if (queryClient.isMutating({ mutationKey: setKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
    },
  });
}
