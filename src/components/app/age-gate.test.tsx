import { act, fireEvent, screen } from "@testing-library/react-native";
import { KeyboardAvoidingView, ScrollView } from "react-native";

import { AgeGate } from "./age-gate";
import bgAuth from "@/src/i18n/locales/bg/auth.json";
import enAuth from "@/src/i18n/locales/en/auth.json";
import { renderWithProviders } from "@/test/render-with-providers";

const mockMutateAsync = jest.fn();
let mockIsError = false;
let mockIsPending = false;

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  // Getters, so a test can move the flag after the component has rendered -
  // the hook returns a fresh object on every render either way.
  useRecordAgeAttestation: () => ({
    get isError() {
      return mockIsError;
    },
    get isPending() {
      return mockIsPending;
    },
    mutateAsync: mockMutateAsync,
  }),
}));

// A fixed today, because "under the floor" is a fact about a date relative to
// now: without this the under-floor cases would quietly become passes as the
// suite aged (`reference_calendar_anchored_tests`).
const TODAY = new Date(2026, 8, 3, 12, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] });
  jest.setSystemTime(TODAY);
  mockMutateAsync.mockReset().mockResolvedValue(undefined);
  mockIsError = false;
  mockIsPending = false;
});

afterEach(() => {
  jest.useRealTimers();
});

function fillDate(day: string, month: string, year: string) {
  fireEvent.changeText(screen.getByTestId("age-gate-day"), day);
  fireEvent.changeText(screen.getByTestId("age-gate-month"), month);
  fireEvent.changeText(screen.getByTestId("age-gate-year"), year);
}

function chooseCountry(query: string, code: string) {
  fireEvent.changeText(screen.getByTestId("age-gate-country"), query);
  fireEvent.press(screen.getByTestId(`age-gate-country-option-${code}`));
}

async function submit() {
  await act(async () => {
    fireEvent.press(screen.getByTestId("age-gate-submit"));
  });
}

describe("AgeGate", () => {
  it("asks with nothing pre-filled, so no answer is defaulted", () => {
    renderWithProviders(<AgeGate onAttested={jest.fn()} onUnderFloor={jest.fn()} />);

    // ☠️ Especially the YEAR. §3 rules out a default year, and a calendar
    // picker cannot avoid one - it has to open on some month.
    expect(screen.getByTestId("age-gate-year").props.value).toBe("");
    expect(screen.getByTestId("age-gate-day").props.value).toBe("");
    expect(screen.getByTestId("age-gate-month").props.value).toBe("");
    expect(screen.getByTestId("age-gate-country").props.value).toBe("");
  });

  it("holds the submit closed until every question is answered", () => {
    renderWithProviders(<AgeGate onAttested={jest.fn()} onUnderFloor={jest.fn()} />);

    expect(screen.getByTestId("age-gate-submit")).toBeDisabled();
    fillDate("3", "9", "1990");
    expect(screen.getByTestId("age-gate-submit")).toBeDisabled();
    chooseCountry("Germany", "DE");
    expect(screen.getByTestId("age-gate-submit")).toBeEnabled();
  });

  it("stores the verdict and the country, and never the date of birth", async () => {
    const onAttested = jest.fn();
    renderWithProviders(<AgeGate onAttested={onAttested} onUnderFloor={jest.fn()} />);

    fillDate("3", "9", "1990");
    chooseCountry("Germany", "DE");
    await submit();

    // The mutation's whole argument list. If a date of birth ever reaches it,
    // this is where that shows up.
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith("DE");
    expect(onAttested).toHaveBeenCalled();
  });

  it("clears the date of birth out of the form once the verdict is known", async () => {
    renderWithProviders(<AgeGate onAttested={jest.fn()} onUnderFloor={jest.fn()} />);

    fillDate("3", "9", "1990");
    chooseCountry("Germany", "DE");
    await submit();

    expect(screen.getByTestId("age-gate-day").props.value).toBe("");
    expect(screen.getByTestId("age-gate-month").props.value).toBe("");
    expect(screen.getByTestId("age-gate-year").props.value).toBe("");
  });

  it("routes an under-floor answer out without writing anything", async () => {
    const onUnderFloor = jest.fn();
    const onAttested = jest.fn();
    renderWithProviders(<AgeGate onAttested={onAttested} onUnderFloor={onUnderFloor} />);

    // 14 today, against Germany's floor of 16.
    fillDate("3", "9", "2012");
    chooseCountry("Germany", "DE");
    await submit();

    expect(onUnderFloor).toHaveBeenCalled();
    expect(onAttested).not.toHaveBeenCalled();
    // ☠️ Nothing is persisted for a failure - not even `age_floor_met = false`.
    // The account this would be written against is about to be deleted (#1765).
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId("age-gate-year").props.value).toBe("");
  });

  it("reads the floor of the country the person declared, not a fixed one", async () => {
    const onAttested = jest.fn();
    const onUnderFloor = jest.fn();
    renderWithProviders(<AgeGate onAttested={onAttested} onUnderFloor={onUnderFloor} />);

    // The same birth date that failed in Germany above passes in Bulgaria (14).
    fillDate("3", "9", "2012");
    chooseCountry("Bulgaria", "BG");
    await submit();

    expect(mockMutateAsync).toHaveBeenCalledWith("BG");
    expect(onUnderFloor).not.toHaveBeenCalled();
  });

  it("treats an impossible date as a correction, never as an exit", async () => {
    const onUnderFloor = jest.fn();
    renderWithProviders(<AgeGate onAttested={jest.fn()} onUnderFloor={onUnderFloor} />);

    fillDate("31", "2", "1990");
    chooseCountry("Germany", "DE");
    await submit();

    expect(screen.getByTestId("age-gate-invalid-date")).toBeTruthy();
    // ☠️ The exit deletes an account. A typo must never reach it.
    expect(onUnderFloor).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
    // The date stays put so it can be fixed in place.
    expect(screen.getByTestId("age-gate-day").props.value).toBe("31");
  });

  it("clears the date error once a real date is submitted", async () => {
    renderWithProviders(<AgeGate onAttested={jest.fn()} onUnderFloor={jest.fn()} />);

    fillDate("31", "2", "1990");
    chooseCountry("Germany", "DE");
    await submit();
    expect(screen.queryByTestId("age-gate-invalid-date")).toBeTruthy();

    fillDate("28", "2", "1990");
    await submit();
    expect(screen.queryByTestId("age-gate-invalid-date")).toBeNull();
  });

  it("keeps the person on the gate when the write fails", async () => {
    const onAttested = jest.fn();
    mockMutateAsync.mockRejectedValue(new Error("offline"));
    renderWithProviders(<AgeGate onAttested={onAttested} onUnderFloor={jest.fn()} />);

    fillDate("3", "9", "1990");
    chooseCountry("Germany", "DE");
    await submit();

    expect(onAttested).not.toHaveBeenCalled();
  });

  it("wears the app's keyboard chrome, so its fields survive an open keyboard", () => {
    renderWithProviders(<AgeGate onAttested={jest.fn()} onUnderFloor={jest.fn()} />);

    // ☠️ "padding" on BOTH platforms. Edge-to-edge (Expo SDK 54 / Android 15)
    // turns `adjustResize` into `adjustNothing`, so the iOS-only conditional
    // would leave the Android keyboard covering the country field outright.
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("padding");
    // ☠️ And the country results are tapped WHILE the keyboard is open: the
    // default swallows that first tap as a keyboard dismissal.
    expect(screen.UNSAFE_getAllByType(ScrollView)[0].props.keyboardShouldPersistTaps).toBe(
      "handled",
    );
  });

  it("shows the save error when the mutation is in its error state", () => {
    mockIsError = true;
    renderWithProviders(<AgeGate onAttested={jest.fn()} onUnderFloor={jest.fn()} />);

    expect(screen.getByText(enAuth.ageGate.error)).toBeTruthy();
  });
});

/**
 * COPPA neutrality, asserted on the copy itself rather than on a render.
 *
 * §3's requirement is that nothing before or during the questions states or
 * implies the qualifying age - so the thing to pin is the strings, in both
 * locales, including the ones a future edit might add to this block.
 */
describe("age gate copy", () => {
  const locales = [
    ["en", enAuth.ageGate as Record<string, string>],
    ["bg", bgAuth.ageGate as Record<string, string>],
  ] as const;

  // The three placeholders are the one legitimate run of digit-shaped text on
  // the screen ("DD", "MM", "YYYY") - and they carry no digits either, which is
  // why they need no exemption from the rule below.
  const PLACEHOLDERS = ["dayPlaceholder", "monthPlaceholder", "yearPlaceholder"];

  /** Every phrase that would tell a reader which answer passes. */
  const TELLS = [
    "must be",
    "at least",
    "or older",
    "years old",
    "old enough",
    "minimum age",
    "или повече",
    "най-малко",
    "навършил",
    "минимална възраст",
  ];

  function namesAnAge(block: Record<string, string>): boolean {
    return Object.entries(block).some(
      ([key, value]) => !PLACEHOLDERS.includes(key) && /\d/.test(value),
    );
  }

  function tellsThePassingAnswer(block: Record<string, string>): boolean {
    const joined = Object.values(block).join(" ").toLowerCase();
    return TELLS.some((phrase) => joined.includes(phrase));
  }

  it.each(locales)("names no age anywhere on the %s gate", (_language, block) => {
    expect(namesAnAge(block)).toBe(false);
  });

  it.each(locales)("does not tell the %s reader what a passing answer is", (_language, block) => {
    expect(tellsThePassingAnswer(block)).toBe(false);
  });

  /**
   * ☠️ The two checks above are absence assertions, which pass just as happily
   * against a predicate that can never fire. These fire them on purpose, so a
   * later edit that guts the rule breaks a test instead of going quiet.
   */
  it("catches copy that names an age", () => {
    expect(namesAnAge({ title: "You must be 13 or older" })).toBe(true);
    expect(namesAnAge({ description: "Selftend is for people aged 16+" })).toBe(true);
  });

  it("catches copy that tells the reader the passing answer", () => {
    expect(tellsThePassingAnswer({ title: "You must be old enough to use Selftend" })).toBe(true);
    expect(tellsThePassingAnswer({ title: "Трябва да си навършил определена възраст" })).toBe(true);
  });
});
