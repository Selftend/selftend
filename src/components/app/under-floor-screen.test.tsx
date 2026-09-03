import { screen } from "@testing-library/react-native";

import { UnderFloorScreen } from "./under-floor-screen";
import bgAuth from "@/src/i18n/locales/bg/auth.json";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { renderWithProviders } from "@/test/render-with-providers";

describe("UnderFloorScreen", () => {
  it("says what happened and that nothing was kept", () => {
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.getByText(enAuth.underFloor.title)).toBeTruthy();
    expect(screen.getByText(enAuth.underFloor.retention)).toBeTruthy();
  });

  it("offers no way onward and no way to answer again", () => {
    // ☠️ §3: the exit must not invite a retry with different answers. A button
    // of any kind here is either a retry or a route into the app, and there is
    // no third thing it could be while #1765 still owes the crisis links.
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

/**
 * The exit copy is calm and non-shaming (§3), and that is a property of the
 * strings rather than of the render - so it is asserted on the strings, in both
 * locales, and the predicate is fired on purpose below so the absence
 * assertions cannot go quiet.
 */
describe("under-floor copy", () => {
  const locales = [
    ["en", enAuth.underFloor as Record<string, string>],
    ["bg", bgAuth.underFloor as Record<string, string>],
  ] as const;

  /** Wording that would scold, or imply the person did something wrong. */
  const SHAMING = [
    "sorry",
    "unfortunately",
    "not allowed",
    "you cannot",
    "violat",
    "lied",
    "dishonest",
    "съжаляваме",
    "за съжаление",
    "нямаш право",
    "нарушен",
    "излъга",
  ];

  /** Wording that would invite another go at the questions. */
  const RETRY = ["try again", "check your answers", "re-enter", "опитай отново", "провери отново"];

  function contains(block: Record<string, string>, phrases: readonly string[]): boolean {
    const joined = Object.values(block).join(" ").toLowerCase();
    return phrases.some((phrase) => joined.includes(phrase));
  }

  it.each(locales)("does not scold the %s reader", (_language, block) => {
    expect(contains(block, SHAMING)).toBe(false);
  });

  it.each(locales)("does not invite the %s reader to answer again", (_language, block) => {
    expect(contains(block, RETRY)).toBe(false);
  });

  it("would catch copy that scolded or invited a retry", () => {
    expect(contains({ body: "Unfortunately you are not allowed here." }, SHAMING)).toBe(true);
    expect(contains({ body: "Check your answers and try again." }, RETRY)).toBe(true);
    expect(contains({ body: "За съжаление нямаш право на достъп." }, SHAMING)).toBe(true);
  });
});
