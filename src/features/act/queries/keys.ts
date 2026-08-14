import type { ActionStatus } from "@/src/features/act/types";

export const u = (userId: string | null) => userId ?? "anonymous";

/**
 * Home's one-row recency and count reads (#990) all hang off their tool's list key
 * rather than a sibling root, so the existing save/delete invalidations - which target
 * the list prefix - reach them without a single new invalidate call.
 */
export const actKeys = {
  all: ["act"] as const,
  programState: (userId: string | null) => ["act", "programState", u(userId)] as const,
  defusionList: (userId: string | null) => ["act", "defusion", "list", u(userId)] as const,
  defusionLatest: (userId: string | null) =>
    ["act", "defusion", "list", u(userId), "latest"] as const,
  defusionDetail: (userId: string | null, logId: string | null) =>
    ["act", "defusion", "detail", u(userId), u(logId)] as const,
  expansionList: (userId: string | null) => ["act", "expansion", "list", u(userId)] as const,
  expansionLatest: (userId: string | null) =>
    ["act", "expansion", "list", u(userId), "latest"] as const,
  expansionDetail: (userId: string | null, logId: string | null) =>
    ["act", "expansion", "detail", u(userId), u(logId)] as const,
  urgeSurfList: (userId: string | null) => ["act", "urgeSurf", "list", u(userId)] as const,
  connectionList: (userId: string | null) => ["act", "connection", "list", u(userId)] as const,
  connectionLatest: (userId: string | null, technique: string) =>
    ["act", "connection", "list", u(userId), "latest", technique] as const,
  connectionDetail: (userId: string | null, logId: string | null) =>
    ["act", "connection", "detail", u(userId), u(logId)] as const,
  observingList: (userId: string | null) => ["act", "observing", "list", u(userId)] as const,
  observingLatest: (userId: string | null) =>
    ["act", "observing", "list", u(userId), "latest"] as const,
  observingDetail: (userId: string | null, sessionId: string | null) =>
    ["act", "observing", "detail", u(userId), u(sessionId)] as const,
  valuesList: (userId: string | null) => ["act", "values", "list", u(userId)] as const,
  valueDomain: (userId: string | null, domain: string | null) =>
    ["act", "values", "domain", u(userId), u(domain)] as const,
  bullsEyeList: (userId: string | null) => ["act", "bullsEye", "list", u(userId)] as const,
  committedActionList: (userId: string | null, status?: ActionStatus) =>
    ["act", "committedAction", "list", u(userId), status] as const,
  // Prefix matcher used by mutations to invalidate every status filter at once.
  committedActionListPrefix: (userId: string | null) =>
    ["act", "committedAction", "list", u(userId)] as const,
  committedActionCount: (userId: string | null, status?: ActionStatus) =>
    ["act", "committedAction", "list", u(userId), status, "count"] as const,
  committedActionDetail: (userId: string | null, actionId: string | null) =>
    ["act", "committedAction", "detail", u(userId), u(actionId)] as const,
  actionStepList: (userId: string | null, actionId: string | null) =>
    ["act", "actionStep", "list", u(userId), u(actionId)] as const,
  actionStepAll: (userId: string | null) => ["act", "actionStep", "all", u(userId)] as const,
  choicePointList: (userId: string | null) => ["act", "choicePoint", "list", u(userId)] as const,
  choicePointLatest: (userId: string | null) =>
    ["act", "choicePoint", "list", u(userId), "latest"] as const,
  choicePointDetail: (userId: string | null, id: string | null) =>
    ["act", "choicePoint", "detail", u(userId), u(id)] as const,
};
