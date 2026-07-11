import { resolveActiveStrategyKeys } from "@/src/features/recovery/active-strategies";
import type { RecoverySources } from "@/src/features/recovery/sources";
import { strategyKeys } from "@/src/features/cbt/strategies";

describe("resolveActiveStrategyKeys", () => {
  it("short-circuits to configured preferences, ignoring records", () => {
    const sources: RecoverySources = {
      goals: [{ createdAt: "2026-05-01T12:00:00.000Z", status: "active" }],
    };
    const result = resolveActiveStrategyKeys({ activeStrategies: ["thoughts", "worry"] }, sources);
    expect(result).toEqual(["thoughts", "worry"]);
  });

  it("drops invalid keys from configured preferences", () => {
    const result = resolveActiveStrategyKeys(
      { activeStrategies: ["thoughts", "not-a-strategy"] },
      {},
    );
    expect(result).toEqual(["thoughts"]);
  });

  it("infers from record-backed sources in a fixed order when no prefs are set", () => {
    const sources: RecoverySources = {
      thoughtRecords: [{ createdAt: "2026-05-01T12:00:00.000Z" }],
      goals: [{ createdAt: "2026-05-01T12:00:00.000Z", status: "active" }],
      angerLogs: [{ createdAt: "2026-05-01T12:00:00.000Z" }],
    };
    const result = resolveActiveStrategyKeys({ activeStrategies: [] }, sources);
    // Order follows the inference sequence, not the input order.
    expect(result).toEqual(["goals", "thoughts", "anger"]);
  });

  it("only counts a values profile with at least one personal value", () => {
    const withValues = resolveActiveStrategyKeys(null, {
      valuesProfile: { updatedAt: "2026-05-01T12:00:00.000Z", personalValues: [{}] },
    });
    expect(withValues).toEqual(["values"]);

    const withoutValues = resolveActiveStrategyKeys(null, {
      valuesProfile: { updatedAt: "2026-05-01T12:00:00.000Z", personalValues: [] },
    });
    expect(withoutValues).toEqual([...strategyKeys]);
  });

  it("falls back to all strategy keys for an empty account", () => {
    expect(resolveActiveStrategyKeys(null, {})).toEqual([...strategyKeys]);
    expect(resolveActiveStrategyKeys(undefined, {})).toEqual([...strategyKeys]);
  });
});
