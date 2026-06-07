import { useQuery } from "@tanstack/react-query";

import { listMindfulnessSessions } from "@/src/features/mindfulness/repository";

const mindfulnessKeys = {
  all: ["mindfulness"] as const,
  list: (userId: string) => ["mindfulness", "list", userId] as const,
};

export function useMindfulnessSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? mindfulnessKeys.list(userId) : ["mindfulness", "list", "anonymous"],
    queryFn: () => listMindfulnessSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}
