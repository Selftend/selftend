import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";

interface LoadMoreFooterProps {
  /**
   * The read is in error while rows are already on screen — a later page failed. The
   * caller derives this (`isError && rows.length > 0`) because the first page's failure
   * belongs to `ListEmptyComponent`, and this footer must not repeat it under an empty list.
   */
  failed: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
  /**
   * What the error row says; the paged-list line by default. A list assembled from
   * MORE THAN ONE read (the DBT scripts ladder, #2259) passes its own, because what
   * failed there is a whole half of the list, not a later page of it.
   */
  message?: string;
}

/**
 * The foot of a keyset-paged `FlatList`: the next page's spinner, or — when that page
 * failed — the error the list would otherwise swallow (#2187).
 *
 * ☠️ `ListEmptyComponent` renders only while `data` is empty, so an `ErrorState` placed
 * there covers exactly one failure: page one's. TanStack keeps `data` across a failed
 * `fetchNextPage` and only flips `isError`, so a page-two failure leaves the rows on screen
 * and the empty slot unrendered — the list simply stops at the last good page, with no
 * error, no retry control, and no word that anything is missing. On a screen whose job is
 * being the complete record, that is a cap wearing the face of the end.
 *
 * Retrying goes through `fetchNextPage`, never `refetch`: the loaded pages are fine, and a
 * full refetch would re-read (and, for ACT and DBT, re-decrypt) every one of them to
 * recover the one that failed. TanStack derives the next cursor from the last GOOD page,
 * so a second `fetchNextPage` asks for exactly the page that failed.
 */
export function LoadMoreFooter({
  failed,
  isFetchingNextPage,
  onRetry,
  message,
}: LoadMoreFooterProps) {
  const { t } = useTranslation("errors");

  if (isFetchingNextPage) {
    return (
      <View className="py-6">
        <ActivityIndicator />
      </View>
    );
  }

  if (!failed) return null;

  return (
    <View className="items-center gap-3 py-6">
      <Text variant="muted" className="text-center">
        {message ?? t("loadMore.failed")}
      </Text>
      <Button variant="secondary" onPress={onRetry}>
        <Text>{t("fallback.retry")}</Text>
      </Button>
    </View>
  );
}
