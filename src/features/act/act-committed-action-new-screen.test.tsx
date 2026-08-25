import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";

import ActCommittedActionNewScreen from "@/src/features/act/act-committed-action-new-screen";
import { useSaveCommittedAction } from "@/src/features/act/queries";
import { addDaysToKey, formatCalendarDayName, parseLocalNoon } from "@/src/utils/date";
import { isolateCalendarLocale } from "@/test/calendar-testing";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The committed-action wizard's target date, with the REAL calendar in the tree.
 *
 * The field used to be a plain `Textarea` over a Postgres `date` column, so
 * "next Tuesday" — the most natural thing to write in a box labelled *target
 * date* — failed the entire save and lost the action the user had just written
 * (#1303). These tests hold the two halves of the fix together: free text is
 * gone, and what the calendar produces reaches the mutation unchanged.
 */

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/committed-action/new",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

const mockShowToast = jest.fn();

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: jest.Mock }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

jest.mock("@/src/features/act/queries", () => ({
  useSaveCommittedAction: jest.fn(),
}));

const mockUseSave = useSaveCommittedAction as jest.MockedFunction<typeof useSaveCommittedAction>;

// The clamp holds back every day before today, so the day under test has to be
// in the future — and inside the SAME month, because the grid ships
// `showOutsideDays: false` and simply does not render a neighbouring month's
// days. 06:00 UTC is 11:30 on 15 March in the suite's Asia/Kolkata frame.
const NOW = new Date("2026-03-15T06:00:00.000Z");

isolateCalendarLocale();

let mutateAsync: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: NOW });
  mutateAsync = jest.fn().mockResolvedValue({ id: "action-1" });
  mockUseSave.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
    typeof useSaveCommittedAction
  >);
});

afterEach(() => {
  jest.useRealTimers();
});

const TARGET_LABEL = "Target date (optional)";
/** `getByRole`'s `name` is a regex here, and the label has parentheses in it. */
const TARGET_LABEL_PATTERN = TARGET_LABEL.replace(/[()]/g, "\\$&");

function targetDateTrigger() {
  return screen.getByRole("button", { name: new RegExp(`^${TARGET_LABEL_PATTERN}: `) });
}

/** Walk the wizard from the domain step to the action step, naming the action. */
function reachActionStep() {
  renderWithProviders(<ActCommittedActionNewScreen />);
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.changeText(
    screen.getByLabelText("What are you committing to?"),
    "Walk three times this week",
  );
}

/** Finish the wizard from the action step and press Save. */
function saveFromActionStep() {
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Save"));
}

/**
 * A day cell by the name it carries, which since #1301 is the full
 * "Sunday, March 15, 2026" rather than a bare number.
 *
 * Matched on the TAIL, because today's cell is prefixed — "Today, Sunday,
 * March 15, 2026" — and the clamp tests need today itself. Scoped to the grid
 * because the trigger's own label ends in a formatted date too.
 */
function dayCell(dateKey: string) {
  const name = formatCalendarDayName(parseLocalNoon(dateKey), "en");
  return within(screen.getByTestId("days")).getByLabelText(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  );
}

describe("the committed action's target date", () => {
  it("is a calendar trigger, not a box the user can type a date into", () => {
    reachActionStep();

    expect(targetDateTrigger()).toBeTruthy();
    // The old free-text field carried the label verbatim; the trigger composes
    // the value into its name. An exact match here can only be the Textarea.
    expect(screen.queryByLabelText(TARGET_LABEL)).toBeNull();
  });

  it("reads as unset before anything is picked", () => {
    reachActionStep();

    expect(screen.getByText("No date set")).toBeTruthy();
  });

  it("saves the day the user picked, as a day key", async () => {
    const picked = addDaysToKey("2026-03-15", 5);
    reachActionStep();

    fireEvent.press(targetDateTrigger());
    fireEvent.press(dayCell(picked));
    fireEvent.press(screen.getByText("Done"));
    saveFromActionStep();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ targetDate: picked }));
  });

  it("saves no date at all when the user never opens the calendar", async () => {
    reachActionStep();
    saveFromActionStep();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    // `null`, never `""` — an empty string is not a day and the column would
    // refuse it.
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ targetDate: null }));
  });

  it("goes back to no date when the sheet's Clear is used", async () => {
    reachActionStep();

    fireEvent.press(targetDateTrigger());
    fireEvent.press(dayCell(addDaysToKey("2026-03-15", 5)));
    fireEvent.press(screen.getByText("Done"));

    fireEvent.press(targetDateTrigger());
    fireEvent.press(screen.getByText("Clear"));

    expect(screen.getByText("No date set")).toBeTruthy();
    saveFromActionStep();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ targetDate: null }));
  });

  it("holds back the days already gone, and offers the days ahead", () => {
    reachActionStep();

    fireEvent.press(targetDateTrigger());

    // Nothing here is an edit path — a committed action can only be created —
    // so there is no stored past date to exempt, and every past day is closed.
    expect(dayCell("2026-03-14")).toBeDisabled();
    expect(dayCell("2026-03-15")).not.toBeDisabled();
    expect(dayCell("2026-03-20")).not.toBeDisabled();
  });
});
