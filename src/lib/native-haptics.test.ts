/**
 * The haptic counterpart to the session sounds (#1741): one tap per bell, one per
 * breath phase, differing only in weight - and native only, by construction.
 */
import { setPlatformOS } from "@/test/modal-marker-mock";

const mockImpactAsync = jest.fn().mockResolvedValue(undefined);
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

type NativeHaptics = typeof import("@/src/lib/native-haptics");
const freshHaptics = () => {
  let haptics!: NativeHaptics;
  jest.isolateModules(() => {
    haptics = jest.requireActual<NativeHaptics>("@/src/lib/native-haptics");
  });
  return haptics;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  mockImpactAsync.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  setPlatformOS("ios");
});

describe("native haptics", () => {
  it("taps heavy for a bell and light for a breath phase, one impact each", () => {
    const haptics = freshHaptics();
    haptics.bellHaptic();
    haptics.phaseHaptic();

    expect(mockImpactAsync.mock.calls).toEqual([["heavy"], ["light"]]);
  });

  it("does nothing on web, where the module is never even loaded", () => {
    // expo-haptics backs web with the Vibration API on a few browsers, which
    // would be a fake on most and a surprise on the rest (#1741).
    setPlatformOS("web");
    const haptics = freshHaptics();
    haptics.bellHaptic();
    haptics.phaseHaptic();

    expect(mockImpactAsync).not.toHaveBeenCalled();
  });

  it("swallows a rejected impact: a haptic never crashes a session", async () => {
    mockImpactAsync.mockRejectedValueOnce(new Error("no engine"));
    const haptics = freshHaptics();

    expect(() => haptics.bellHaptic()).not.toThrow();
    await flush();
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
  });
});
