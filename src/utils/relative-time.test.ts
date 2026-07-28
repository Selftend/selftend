import { createInstance } from "i18next";

import enCommon from "@/src/i18n/locales/en/common.json";
import enSleep from "@/src/i18n/locales/en/sleep.json";
import { formatRelativeActivity, formatRelativeDayKey } from "@/src/utils/relative-time";

// A minimal TFunction stand-in that echoes the key (+ count) so assertions read clearly.
const t = ((key: string, opts?: { count?: number }) =>
  opts?.count === undefined ? key : `${key}:${opts.count}`) as unknown as Parameters<
  typeof formatRelativeActivity
>[1];

describe("formatRelativeActivity", () => {
  const now = new Date("2026-05-24T12:00:00.000Z");

  it("returns today for a log earlier the same local day", () => {
    expect(formatRelativeActivity("2026-05-24T01:00:00.000Z", t, now)).toBe("relativeTime.today");
  });

  it("treats a future log as today (non-negative day diff)", () => {
    expect(formatRelativeActivity("2026-05-25T01:00:00.000Z", t, now)).toBe("relativeTime.today");
  });

  it("returns yesterday for exactly one local day earlier", () => {
    // Use midday UTC to avoid local-timezone ambiguity at day boundaries
    expect(formatRelativeActivity("2026-05-23T12:00:00.000Z", t, now)).toBe(
      "relativeTime.yesterday",
    );
  });

  it("returns daysAgo with the day count for older logs", () => {
    expect(formatRelativeActivity("2026-05-20T08:00:00.000Z", t, now)).toBe(
      "relativeTime.daysAgo:4",
    );
  });
});

describe("formatRelativeDayKey", () => {
  it("labels the captured day, not the viewer's day for that instant", () => {
    expect(formatRelativeDayKey("2026-05-24", t, "2026-05-24")).toBe("relativeTime.today");
    expect(formatRelativeDayKey("2026-05-23", t, "2026-05-24")).toBe("relativeTime.yesterday");
    expect(formatRelativeDayKey("2026-05-20", t, "2026-05-24")).toBe("relativeTime.daysAgo:4");
  });

  // Flying east-to-west can leave an entry keyed a day ahead of where you land;
  // clamping to "today" keeps the label calm rather than showing a negative count.
  it("treats a captured day ahead of today as today", () => {
    expect(formatRelativeDayKey("2026-05-25", t, "2026-05-24")).toBe("relativeTime.today");
  });
});

// The keys live in `common` but every caller passes the `t` it already holds from its own
// feature namespace. These run against a real i18next instance because the whole dedupe
// rests on an explicit `ns` option beating the namespace a fixed `t` was bound to - a
// hand-rolled stub would happily agree with a broken implementation.
describe("reading the shared keys through a feature-bound t", () => {
  const now = new Date("2026-05-24T12:00:00.000Z");
  const instance = createInstance();

  beforeAll(async () => {
    await instance.init({
      lng: "en",
      fallbackLng: "en",
      defaultNS: "common",
      ns: ["common", "sleep"],
      interpolation: { escapeValue: false },
      resources: {
        en: {
          common: enCommon,
          sleep: enSleep,
        },
      },
    });
  });

  it("resolves common keys from a t bound to the sleep namespace", () => {
    const sleepT = instance.getFixedT("en", "sleep");

    expect(formatRelativeActivity("2026-05-24T01:00:00.000Z", sleepT, now)).toBe("Today");
    expect(formatRelativeActivity("2026-05-23T12:00:00.000Z", sleepT, now)).toBe("Yesterday");
    expect(formatRelativeActivity("2026-05-20T08:00:00.000Z", sleepT, now)).toBe("4 days ago");
    expect(formatRelativeDayKey("2026-05-23", sleepT, "2026-05-24")).toBe("Yesterday");
  });

  it("pluralises the single-day case", () => {
    const sleepT = instance.getFixedT("en", "sleep");

    expect(formatRelativeActivity("2026-05-22T12:00:00.000Z", sleepT, now)).toBe("2 days ago");
    // A count of 1 renders as "Yesterday", never as daysAgo, so assert the _one plural
    // form directly - otherwise it could rot unnoticed in a language where it is reachable.
    expect(sleepT("relativeTime.daysAgo", { ns: "common", count: 1 })).toBe("1 day ago");
  });

  // The point of the move: the label the sleep list shows must come from `common`, and
  // `sleep` must not have grown its own copy back.
  it("keeps the keys in common only, not re-copied into a feature namespace", () => {
    expect(enCommon.relativeTime).toBeDefined();
    expect("relativeTime" in enSleep).toBe(false);
  });
});
