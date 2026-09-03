import { fireEvent, screen } from "@testing-library/react-native";

import { UnderFloorScreen } from "./under-floor-screen";
import bgAuth from "@/src/i18n/locales/bg/auth.json";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { crisisActionUrls } from "@/src/features/policies/policy-content";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    // Mirror Link asChild: forward the href onto the wrapped pressable so the
    // real link target can be asserted (the shape landing-footer.test uses).
    Link: ({
      href,
      asChild: _asChild,
      dangerouslySingular: _dangerouslySingular,
      children,
    }: {
      href: string;
      asChild?: boolean;
      dangerouslySingular?: boolean;
      children: React.ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
  };
});

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

const mockRetry = jest.fn();
let mockExitState = "erased";

// The erasure sequence itself - the order of the block and the deletion, what
// a failure does to the session - is use-under-floor-exit.test.tsx's. Here the
// hook is a dial, so each state it can report can be rendered.
jest.mock("@/src/features/auth/use-under-floor-exit", () => ({
  useUnderFloorExit: () => ({ retry: mockRetry, state: mockExitState }),
}));

const mockOpenExternalUrl = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

beforeEach(() => {
  jest.clearAllMocks();
  mockExitState = "erased";
});

describe("UnderFloorScreen", () => {
  it("says what happened and that nothing was kept", () => {
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.getByText(enAuth.underFloor.title)).toBeTruthy();
    expect(screen.getByText(enAuth.underFloor.retention)).toBeTruthy();
  });

  it("offers no way onward and no way to answer again", () => {
    // ☠️ §3: the exit must not invite a retry with different answers. Every
    // control on the screen is enumerated here rather than counted, so a
    // future button has to be justified in this list before it can pass: the
    // two links out, and nothing that leads into the app or back to the gate.
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
    expect(screen.queryAllByRole("button")).toHaveLength(crisisActionUrls.length);
    expect(screen.queryByTestId("under-floor-erasure-retry")).toBeNull();
  });
});

/**
 * The links are the point of the screen (§3), and both have to work for someone
 * who is about to have no account.
 */
describe("under-floor support links", () => {
  it("links to crisis guidance at the root route, which renders with no session", () => {
    renderWithProviders(<UnderFloorScreen />);

    // `/crisis` is a sibling of the `(app)` group, not a screen inside it -
    // which is what makes it reachable after the account is gone. A target
    // under `(app)` would be a dead link by the time this screen is up.
    const link = screen.getByRole("link", { name: "Open crisis guidance" });
    expect(link.props.href).toBe("/crisis");
    expect(String(link.props.href)).not.toContain("(app)");
  });

  it("opens Find A Helpline, at the URL the crisis page itself uses", () => {
    renderWithProviders(<UnderFloorScreen />);

    fireEvent.press(screen.getByText("Open Find A Helpline"));

    expect(mockOpenExternalUrl).toHaveBeenCalledWith("https://findahelpline.com/");
    // One home for the URL: the same table app/crisis.tsx reads.
    expect(crisisActionUrls.map((action) => action.url)).toContain("https://findahelpline.com/");
  });
});

/**
 * A deletion that quietly failed would leave a live account behind a screen
 * promising there is none - which is the one thing the ticket rules out.
 */
describe("under-floor erasure status", () => {
  it("says the erasure is under way while it runs", () => {
    mockExitState = "working";
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.getByTestId("under-floor-erasure")).toHaveTextContent(enAuth.underFloor.erasing);
  });

  it("says the account is gone once it is", () => {
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.getByTestId("under-floor-erasure")).toHaveTextContent(enAuth.underFloor.erased);
  });

  it("says so when the erasure did not land, rather than claiming it did", () => {
    mockExitState = "failed";
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.getByTestId("under-floor-erasure")).toHaveTextContent(
      enAuth.underFloor.erasureFailed,
    );
    expect(screen.queryByText(enAuth.underFloor.erased)).toBeNull();
  });

  it("claims no removal when there was no account to remove", () => {
    // ☠️ A returning blocked device has no session. Saying "the account has
    // been removed" there would be the screen asserting something it never
    // observed, so it says nothing about the erasure at all.
    mockExitState = "nothing-to-erase";
    renderWithProviders(<UnderFloorScreen />);

    expect(screen.queryByTestId("under-floor-erasure")).toBeNull();
    expect(screen.queryByText(enAuth.underFloor.erased)).toBeNull();
    // The block itself, and the way out, are still exactly as they were.
    expect(screen.getByText(enAuth.underFloor.title)).toBeTruthy();
    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
  });

  it("offers to run the erasure again - the account, never the answers", () => {
    mockExitState = "failed";
    renderWithProviders(<UnderFloorScreen />);

    fireEvent.press(screen.getByTestId("under-floor-erasure-retry"));

    expect(mockRetry).toHaveBeenCalledTimes(1);
    // Still no route anywhere but out: a failed erasure must not become a way
    // back into the app.
    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
  });
});

/**
 * The exit copy is calm and non-shaming (§3), and that is a property of the
 * strings rather than of the render - so it is asserted on the strings, in both
 * locales, and the predicate is fired on purpose below so the absence
 * assertions cannot go quiet.
 *
 * It covers the whole `underFloor` block, so #1765's erasure and support copy
 * is held to the same bar as #1764's original four lines - including the
 * erasure retry, which is why that control is worded about the account
 * ("Remove it now") and never about having another go at the questions.
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

  it.each(locales)("keeps the %s erasure and support copy in the guarded block", (_l, block) => {
    // Guards the guard: if #1765's keys were added outside `underFloor`, every
    // assertion above would still pass while saying nothing about them.
    expect(Object.keys(block)).toEqual(
      expect.arrayContaining([
        "erasing",
        "erased",
        "erasureFailed",
        "erasureRetryLabel",
        "supportTitle",
        "supportBody",
      ]),
    );
  });
});
