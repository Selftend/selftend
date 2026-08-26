import { exportHasUserContent } from "./guest-content";

// The boundary #1444's warning stands on: what counts as "user-created
// content" when a guest is about to abandon this device's account. The
// polarity under test is the load-bearing part - unknown keys COUNT, so a
// tool added tomorrow is protected without anyone updating the exclusion set.
describe("exportHasUserContent", () => {
  it("is false for a guest who only ever opened the app (auto rows + consent/onboarding)", () => {
    expect(
      exportHasUserContent({
        exportDate: "2026-08-26T00:00:00Z",
        profile: { displayName: null },
        preferences: { onboarding_completed: true, policy_consent_version: "3" },
        devicePushTokens: [],
        webPushSubscriptions: [],
        emotionPreferences: [{ emotion: "joy", hidden: true }],
        widgetPreferences: { layout: "compact" },
        feedbackSubmissions: [{ message: "hi" }],
        moodLogs: [],
        thoughtRecords: [],
        gratitudeEntries: null,
      }),
    ).toBe(false);
  });

  it("is true the moment any tool holds a row", () => {
    expect(
      exportHasUserContent({
        exportDate: "2026-08-26T00:00:00Z",
        preferences: { onboarding_completed: true },
        gratitudeEntries: [{ item_1: "a quiet morning" }],
      }),
    ).toBe(true);
  });

  it("counts a non-empty object row (program state) as content", () => {
    expect(exportHasUserContent({ actProgramState: { phase: 2 } })).toBe(true);
  });

  it("counts an UNKNOWN non-empty key as content - new tools are protected by default", () => {
    expect(exportHasUserContent({ someBrandNewToolLogs: [{ id: 1 }] })).toBe(true);
  });

  it("ignores scalars, nulls, and empty containers under unknown keys", () => {
    expect(
      exportHasUserContent({
        someCount: 3,
        someFlag: true,
        someNull: null,
        someEmpty: [],
        someEmptyObject: {},
      }),
    ).toBe(false);
  });

  it("is false for non-object payloads", () => {
    expect(exportHasUserContent(null)).toBe(false);
    expect(exportHasUserContent(undefined)).toBe(false);
    expect(exportHasUserContent([])).toBe(false);
    expect(exportHasUserContent("{}")).toBe(false);
  });
});
