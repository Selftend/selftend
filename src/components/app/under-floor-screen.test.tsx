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

const mockEraseAccount = jest.fn();
const mockUseUnderFloorExit = jest.fn();
let mockExitState = "erased";

// The erasure sequence itself - the order of the block and the deletion, whose
// account it may act on, what a failure does to the session - is
// use-under-floor-exit.test.tsx's. Here the hook is a dial, so each state it
// can report can be rendered; the spy on its ARGUMENT is what pins the one
// thing this file owns about the erasure, which is what the screen tells it to
// act on (#2195).
jest.mock("@/src/features/auth/use-under-floor-exit", () => ({
  useUnderFloorExit: (verdictUserId: string | null) => {
    mockUseUnderFloorExit(verdictUserId);
    return { eraseAccount: mockEraseAccount, state: mockExitState };
  },
}));

/** The ordinary mount: a verdict, rendered for the account it judged. */
const renderScreen = (verdictUserId: string | null = "user-1") =>
  renderWithProviders(<UnderFloorScreen verdictUserId={verdictUserId} />);

const mockOpenExternalUrl = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

beforeEach(() => {
  jest.clearAllMocks();
  mockExitState = "erased";
});

describe("UnderFloorScreen", () => {
  it("says what happened and that nothing was kept", () => {
    renderScreen();

    expect(screen.getByText(enAuth.underFloor.title)).toBeTruthy();
    expect(screen.getByText(enAuth.underFloor.retention)).toBeTruthy();
  });

  it("acts on the account the VERDICT judged, never on whoever is signed in", () => {
    // ☠️☠️ #2195. The screen renders for ANY session inside the 24h device
    // window, so reading the current user here is what made the block delete
    // the next account signed in on a shared phone. The id comes down as a
    // prop from the verdict, and the screen passes it through untouched.
    renderScreen("user-a");

    expect(mockUseUnderFloorExit).toHaveBeenCalledWith("user-a");
  });

  it("tells the exit there is nobody to erase when the block judged nobody", () => {
    renderScreen(null);

    expect(mockUseUnderFloorExit).toHaveBeenCalledWith(null);
  });

  it("offers no way onward and no way to answer again", () => {
    // ☠️ §3: the exit must not invite a retry with different answers. Every
    // control on the screen is enumerated here rather than counted, so a
    // future button has to be justified in this list before it can pass: the
    // two links out, and nothing that leads into the app or back to the gate.
    renderScreen();

    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
    expect(screen.queryAllByRole("button")).toHaveLength(crisisActionUrls.length);
    expect(screen.queryByTestId("under-floor-erasure-retry")).toBeNull();
    expect(screen.queryByTestId("under-floor-erasure-confirm")).toBeNull();
  });
});

/**
 * The links are the point of the screen (§3), and both have to work for someone
 * who is about to have no account.
 */
describe("under-floor support links", () => {
  it("links to crisis guidance at the root route, which renders with no session", () => {
    renderScreen();

    // `/crisis` is a sibling of the `(app)` group, not a screen inside it -
    // which is what makes it reachable after the account is gone. A target
    // under `(app)` would be a dead link by the time this screen is up.
    const link = screen.getByRole("link", { name: "Open crisis guidance" });
    expect(link.props.href).toBe("/crisis");
    expect(String(link.props.href)).not.toContain("(app)");
  });

  it("opens Find A Helpline, at the URL the crisis page itself uses", () => {
    renderScreen();

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
    renderScreen();

    expect(screen.getByTestId("under-floor-erasure")).toHaveTextContent(enAuth.underFloor.erasing);
  });

  it("says the account is gone once it is", () => {
    renderScreen();

    expect(screen.getByTestId("under-floor-erasure")).toHaveTextContent(enAuth.underFloor.erased);
  });

  it("says so when the erasure did not land, rather than claiming it did", () => {
    mockExitState = "failed";
    renderScreen();

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
    renderScreen();

    expect(screen.queryByTestId("under-floor-erasure")).toBeNull();
    expect(screen.queryByText(enAuth.underFloor.erased)).toBeNull();
    // ☠️ And no "nothing you entered has been kept" either: on this path
    // nothing was removed, so that sentence is a claim the screen never
    // observed - the same rule, applied to the line above it.
    expect(screen.queryByTestId("under-floor-retention")).toBeNull();
    // The block itself, and the way out, are still exactly as they were.
    expect(screen.getByText(enAuth.underFloor.title)).toBeTruthy();
    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
  });

  it("never says the erasure failed without the control that finishes it", () => {
    // ☠️☠️ #2232. The sentence and the control are the two halves of one
    // honest answer: nothing retries by itself, so a failure sentence with no
    // control beside it would be a dead end for someone who has just been told
    // they cannot use the app. Asserted in ONE render, because two tests each
    // rendering `failed` alone cannot see the pair come apart.
    mockExitState = "failed";
    renderScreen();

    expect(screen.getByTestId("under-floor-erasure")).toHaveTextContent(
      enAuth.underFloor.erasureFailed,
    );
    expect(screen.getByTestId("under-floor-erasure-retry")).toBeTruthy();
  });

  it("offers to run the erasure again - the account, never the answers", () => {
    mockExitState = "failed";
    renderScreen();

    fireEvent.press(screen.getByTestId("under-floor-erasure-retry"));

    expect(mockEraseAccount).toHaveBeenCalledTimes(1);
    // Still no route anywhere but out: a failed erasure must not become a way
    // back into the app.
    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
  });
});

/**
 * ☠️☠️ #2193: the purge is the person's to ask for, not the screen's to
 * perform. The press that produced the verdict was the age gate's submit -
 * which names no age and warns of nothing - so the deletion needs a press of
 * its own, on a screen that says what that press does.
 */
describe("the under-floor erasure confirmation", () => {
  it("says the removal is permanent before offering it", () => {
    mockExitState = "awaiting-confirmation";
    renderScreen();

    expect(screen.getByTestId("under-floor-erasure")).toHaveTextContent(
      enAuth.underFloor.erasureConfirm,
    );
    // Not yet: the screen must not claim a removal that has not been asked for.
    expect(screen.queryByTestId("under-floor-retention")).toBeNull();
    expect(screen.queryByText(enAuth.underFloor.erased)).toBeNull();
  });

  it("starts the erasure only when the confirm control is pressed", () => {
    mockExitState = "awaiting-confirmation";
    renderScreen();

    expect(mockEraseAccount).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("under-floor-erasure-confirm"));

    expect(mockEraseAccount).toHaveBeenCalledTimes(1);
  });

  it("keeps the block itself intact while the confirmation waits", () => {
    // The floor does not wait for a press. Whatever the person does with the
    // offer, this screen is still the block - no route into the app, and the
    // support links still the only way out.
    mockExitState = "awaiting-confirmation";
    renderScreen();

    expect(screen.getByText(enAuth.underFloor.title)).toBeTruthy();
    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
    expect(screen.queryByTestId("under-floor-erasure-retry")).toBeNull();
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

  /**
   * ☠️☠️ Wording that would promise the app carries on by itself (#2232).
   *
   * Nothing in the exit retries anything: the purge runs only from a press
   * (`use-under-floor-exit.ts`'s `eraseAccount`, whose docblock forbids calling
   * it from an effect), the mutation is not configured to retry, and a later
   * launch is handed no verdict so it reports `nothing-to-erase` and offers no
   * control at all. `erasureFailed` said "Selftend will keep working to remove
   * it" - true when it was written, because the purge then ran from a mount
   * effect, and falsified by #2195 without the string being revisited. To a
   * person who has just been told they cannot use the app, that reads as "no
   * need to press anything", which is the one thing that would have finished
   * the removal.
   *
   * ⚠️ Affirmative promises only, and deliberately so: the honest copy has to
   * be free to DENY continuing effort ("will not remove it on its own"), which
   * a bare "on its own" or "automatically" blacklist would fire on. Phrase
   * lists cannot see a reworded promise - the behavioural half of this
   * invariant, that nothing re-attempts the deletion by itself, is pinned in
   * `use-under-floor-exit.test.tsx`.
   */
  const KEEPS_WORKING = [
    "will keep working",
    "will keep trying",
    "keeps working",
    "keeps trying",
    "will continue",
    "in the background",
    "ще продължи",
    "продължава да",
    "автоматично",
    "във фонов режим",
  ];

  /**
   * ☠️☠️ Wording that would tell the person their account holds nothing (#2240).
   *
   * `erasureFailed` said the account "is empty" - true by construction while
   * only a brand-new account could reach this screen, and false since #2227
   * widened the gate to accounts created on shipped 0.17.0, which has no age
   * gate: those people have used the app and may hold entries by the time they
   * first meet the question (`docs/age-floor.md`, `docs/dpia-minors-assessment.md`).
   * A person told their account is empty may reasonably not pursue the removal
   * of data that does exist, and by the product's own posture that person may
   * be a child. Only the `erased` state may say nothing was kept, and it does so
   * in `retention`, after observing the removal.
   */
  const EMPTY_CLAIM = [
    "it is empty",
    "is empty",
    "holds nothing",
    "nothing in it",
    "той е празен",
    "е празен",
    "няма нищо в него",
  ];

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

  it.each(locales)("promises the %s reader no work the app never does", (_language, block) => {
    expect(contains(block, KEEPS_WORKING)).toBe(false);
  });

  it.each(locales)("never tells the %s reader the account is empty", (_language, block) => {
    expect(contains(block, EMPTY_CLAIM)).toBe(false);
  });

  it("would catch copy that scolded or invited a retry", () => {
    expect(contains({ body: "Unfortunately you are not allowed here." }, SHAMING)).toBe(true);
    expect(contains({ body: "Check your answers and try again." }, RETRY)).toBe(true);
    expect(contains({ body: "За съжаление нямаш право на достъп." }, SHAMING)).toBe(true);
  });

  it("would catch the promise this screen used to make, in both locales", () => {
    // The exact sentences that shipped before #2232, so the predicate is fired
    // on the regression it exists to refuse rather than on an invented one.
    expect(
      contains(
        { erasureFailed: "It is empty, and Selftend will keep working to remove it." },
        KEEPS_WORKING,
      ),
    ).toBe(true);
    expect(
      contains(
        { erasureFailed: "Той е празен и Selftend ще продължи да работи по премахването му." },
        KEEPS_WORKING,
      ),
    ).toBe(true);
  });

  it("would catch the emptiness claim this screen used to make, in both locales", () => {
    // The exact sentences that shipped before #2240.
    expect(
      contains(
        { erasureFailed: "It is empty, and Selftend will not remove it on its own." },
        EMPTY_CLAIM,
      ),
    ).toBe(true);
    expect(
      contains({ erasureFailed: "Той е празен и Selftend няма да го премахне сам." }, EMPTY_CLAIM),
    ).toBe(true);
  });

  it.each(locales)("keeps the %s erasure and support copy in the guarded block", (_l, block) => {
    // Guards the guard: if #1765's keys were added outside `underFloor`, every
    // assertion above would still pass while saying nothing about them.
    expect(Object.keys(block)).toEqual(
      expect.arrayContaining([
        "erasureConfirm",
        "erasureConfirmLabel",
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
