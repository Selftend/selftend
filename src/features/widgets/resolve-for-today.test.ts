import { resolveForToday } from "@/src/features/widgets/resolve-for-today";
import type { StatPayload } from "@/src/features/widgets/snapshot-types";

const base: StatPayload = {
  kind: "stat",
  title: "Habits",
  emoji: "✅",
  dateKey: "2026-06-05",
  badge: "2/5 today",
  stats: [
    { value: "2/5", label: "Today", dateScoped: true },
    { value: "12", label: "Streak" },
  ],
  open: { label: "Open", path: "/tools/habits" },
};

describe("resolveForToday", () => {
  it("returns the payload unchanged when the day matches", () => {
    expect(resolveForToday(base, "2026-06-05")).toEqual(base);
  });

  it("drops the badge and neutralizes date-scoped stats when the day is stale", () => {
    const r = resolveForToday(base, "2026-06-06") as StatPayload;
    expect(r.badge).toBeNull();
    expect(r.stats[0].value).toBe("–");
    expect(r.stats[1].value).toBe("12");
  });

  it("leaves payloads without a dateKey alone", () => {
    const noDate: StatPayload = { ...base, dateKey: undefined, badge: "x" };
    expect(resolveForToday(noDate, "2099-01-01")).toEqual(noDate);
  });

  it("passes launcher/prompt payloads through untouched", () => {
    const launcher = { kind: "launcher" as const, title: "t", emoji: "x", chips: [] };
    expect(resolveForToday(launcher, "2026-06-06")).toEqual(launcher);
  });
});
