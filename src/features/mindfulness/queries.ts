import { useQuery } from "@tanstack/react-query";

import { listMindfulnessSessions } from "@/src/features/mindfulness/repository";

const mindfulnessKeys = {
  all: ["mindfulness"] as const,
  list: (userId: string) => ["mindfulness", "list", userId] as const,
};

export function useMindfulnessSessions(userId: string | null, limit = 30) {
  return useQuery({
    // Include `limit` in the key (mirroring meditation's list key) so callers
    // requesting different windows (e.g. the routines 7-day strip's wider one)
    // don't collide on a single cache entry; invalidation by the limit-less
    // ["mindfulness"] prefix still matches every variant.
    queryKey: userId
      ? [...mindfulnessKeys.list(userId), limit]
      : ["mindfulness", "list", "anonymous", limit],
    queryFn: () => listMindfulnessSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}
