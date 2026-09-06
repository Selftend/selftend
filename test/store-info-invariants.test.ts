// test/store-info-invariants.test.ts
//
// The merge gate on Selftend's committed App Store listing text (#1611, spec'd
// by #1606). Sibling of store-advisory-invariants.test.ts, and it exists for the
// same reason one file over: .github/workflows/store-metadata-drift.yml asks
// weekly whether App Store Connect still agrees with what is committed, and it
// cannot be a merge gate because it reads a remote a human may legitimately have
// changed. This suite is the half that can.
//
// The specific failure it prevents: a value committed here that Apple could
// never hold - one longer than the field's cap, or a misspelled field name -
// makes the weekly check fail forever with no real drift behind it. store/
// README.md names that outcome outright ("which is how a guard gets muted"), so
// the length and shape checks run at the PR instead.
//
// ⚠️ These are POLICY assertions, not a second copy of the data. Asserting the
// subtitle's exact text would be a restatement that fails the moment the
// listing legitimately changes, and teaches nothing.
import * as fs from "node:fs";
import * as path from "node:path";

// The caps moved to `test/store-caps.ts` on #1944, unchanged, so that
// `positioning-copy.test.ts` can hold `docs/positioning.md`'s written inventory
// of them against the same object rather than a second copy of the numbers.
import { APP_STORE_CAPS as CAPS } from "@/test/store-caps";

const info = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "store", "apple-info.json"), "utf8"),
) as Record<string, unknown>;

describe("Selftend's committed App Store listing text", () => {
  it("commits only fields whose live value was actually read", () => {
    expect(Object.keys(info).sort()).toEqual(Object.keys(CAPS).sort());
  });

  it.each(Object.keys(CAPS))("%s is a non-empty string", (field) => {
    expect(typeof info[field]).toBe("string");
    expect((info[field] as string).trim().length).toBeGreaterThan(0);
  });

  // The load-bearing one. A value over the cap is a value App Store Connect
  // cannot be holding, so the weekly comparison would report drift that is
  // really a typo here - the exact "red for a reason that has nothing to do
  // with drift" that store/README.md warns turns a guard into noise.
  it.each(Object.entries(CAPS))("%s fits App Store Connect's %d-character cap", (field, cap) => {
    expect((info[field] as string).length).toBeLessThanOrEqual(cap);
  });

  // Both live values sit within two characters of their cap, so a rewrite has
  // almost no headroom. Failing here means the copy needs shortening BEFORE it
  // is pushed to Apple, not after the weekly job notices.
  it("leaves the caps' tightness visible rather than implied", () => {
    const headroom = Object.entries(CAPS).map(([field, cap]) => ({
      field,
      spare: cap - (info[field] as string).length,
    }));

    for (const { spare } of headroom) {
      expect(spare).toBeGreaterThanOrEqual(0);
    }
  });
});
