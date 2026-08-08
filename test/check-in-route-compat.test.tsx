import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react-native";

import { isAllowedReminderRoute } from "@/src/lib/notifications";
import { stripComments } from "./source-scan";

// The gate for #732 (decided on #704): the check-in route moved to
// `/tools/check-in`, and the compatibility layer that keeps the old path
// working is PERMANENT on both ends.
//
// It is permanent because this project has no OTA channel - no `expo-updates`,
// no `runtimeVersion`, nothing in `eas.json` - so every client change is a
// store release with no hotfix path and an unbounded tail of users who never
// update. There is no future build in which every client is current, so there
// is no future date on which the old path becomes safe to drop.
//
// Two halves, and both fail silently rather than loudly:
//
//   - The EDGE FUNCTION keeps minting `/tools/mood-tracker`. Flipping it to the
//     new path looks like finishing the rename; what it actually does is break
//     the reminder tap for every user still on an older build, permanently.
//   - The ALLOWLIST keeps accepting it. `isAllowedReminderRoute` gates the tap
//     BEFORE navigation, so a `<Redirect>` stub cannot rescue a de-allowlisted
//     path - the tap simply does nothing.
//
// Neither is reachable from a normal test run: the edge function is Deno and
// not Jest-importable, and nothing in the app navigates to the old path any
// more, so both would go green while every existing reminder died. Hence a
// read-the-file-off-disk gate, in the shape of test/module-identity-neutral.test.ts.

const ROOT = join(__dirname, "..");

const EDGE_FUNCTION = "supabase/functions/_shared/web-reminders.ts";

/** The route the server actually mints for the mood reminder, parsed off disk. */
const MINTED_MOOD_URL = (() => {
  const source = stripComments(readFileSync(join(ROOT, EDGE_FUNCTION), "utf8"));
  const configs = source.indexOf("TARGET_CONFIGS");
  const start = source.indexOf("\n  mood: {", configs);
  if (configs === -1 || start === -1) return null;

  const end = source.indexOf("\n  },", start);
  return /url:\s*"([^"]+)"/.exec(source.slice(start, end === -1 ? undefined : end))?.[1] ?? null;
})();

let mockParams: Record<string, string | string[]> = {};
const mockRedirects: string[] = [];

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    mockRedirects.push(href);
    return null;
  },
}));

/** Renders a legacy stub with `params` in the URL and returns where it forwards to. */
function redirectTarget(
  Stub: React.ComponentType,
  params: Record<string, string | string[]> = {},
): string | undefined {
  mockParams = params;
  mockRedirects.length = 0;
  render(<Stub />);
  return mockRedirects.at(-1);
}

describe("the reminder edge function never flips to the new path (#732)", () => {
  it("still mints /tools/mood-tracker for the mood reminder", () => {
    expect(MINTED_MOOD_URL).toBe("/tools/mood-tracker");
  });

  it("names the new route nowhere in its code", () => {
    const source = stripComments(readFileSync(join(ROOT, EDGE_FUNCTION), "utf8"));
    expect(source).not.toMatch("/tools/check-in");
  });

  it("mints a route the app's deep-link allowlist still accepts", () => {
    // The pairing IS the guard: either side flipped alone is a dead reminder tap.
    expect(MINTED_MOOD_URL).not.toBeNull();
    expect(isAllowedReminderRoute(MINTED_MOOD_URL as string)).toBe(true);
  });

  it("mints a route that a redirect stub still answers", () => {
    expect(existsSync(join(ROOT, `app/(app)${MINTED_MOOD_URL}/index.tsx`))).toBe(true);
  });
});

describe("the check-in routes live at the new path (#732)", () => {
  it.each([
    "app/(app)/tools/check-in/index.tsx",
    "app/(app)/tools/check-in/new.tsx",
    "app/(app)/tools/check-in/[id]/index.tsx",
    "app/(app)/tools/check-in/[id]/edit.tsx",
  ])("%s exists", (file) => {
    expect(existsSync(join(ROOT, file))).toBe(true);
  });

  it("keeps the feature directory, namespace and table names it had", () => {
    // Renaming the path and renaming the `mood` identifier are separable, and
    // only the second is expensive (#694): moving the directory alongside the
    // redesign would defeat git's rename detection and cost `blame`.
    expect(existsSync(join(ROOT, "src/features/mood"))).toBe(true);
    expect(existsSync(join(ROOT, "src/i18n/locales/en/mood.json"))).toBe(true);
  });
});

describe("the legacy stubs forward the query string by hand (#732)", () => {
  // Expo Router drops search params on BOTH of its own redirect mechanisms
  // (verified against 57.0.7), so every one of these would arrive bare if the
  // stubs were rewritten to use the built-ins.
  it("carries the launcher widget's ?score through to the new form", () => {
    const LegacyNew = require("@/app/(app)/tools/mood-tracker/new").default;
    expect(redirectTarget(LegacyNew, { score: "4" })).toBe("/tools/check-in/new?score=4");
  });

  it("carries the CBT activity handoff params", () => {
    const LegacyNew = require("@/app/(app)/tools/mood-tracker/new").default;
    expect(
      redirectTarget(LegacyNew, {
        linkedStrategy: "behavioral-activation",
        completeActivityId: "activity-1",
      }),
    ).toBe(
      "/tools/check-in/new?linkedStrategy=behavioral-activation&completeActivityId=activity-1",
    );
  });

  it("forwards the tool home", () => {
    const LegacyHome = require("@/app/(app)/tools/mood-tracker/index").default;
    expect(redirectTarget(LegacyHome)).toBe("/tools/check-in");
  });

  it("forwards an entry, without repeating the id as a query param", () => {
    const LegacyEntry = require("@/app/(app)/tools/mood-tracker/[id]/index").default;
    expect(redirectTarget(LegacyEntry, { id: "log-1" })).toBe("/tools/check-in/log-1");
    expect(redirectTarget(LegacyEntry, { id: "log-1", from: "widget" })).toBe(
      "/tools/check-in/log-1?from=widget",
    );
  });

  it("forwards an entry's editor", () => {
    const LegacyEdit = require("@/app/(app)/tools/mood-tracker/[id]/edit").default;
    expect(redirectTarget(LegacyEdit, { id: "log-1" })).toBe("/tools/check-in/log-1/edit");
  });

  it("falls back to the tool home when the id is missing", () => {
    const LegacyEntry = require("@/app/(app)/tools/mood-tracker/[id]/index").default;
    const LegacyEdit = require("@/app/(app)/tools/mood-tracker/[id]/edit").default;
    expect(redirectTarget(LegacyEntry)).toBe("/tools/check-in");
    expect(redirectTarget(LegacyEdit)).toBe("/tools/check-in");
  });
});
