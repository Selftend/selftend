import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { defaultUserPreferences } from "@/src/features/modules/types";
import { NotificationTargetRow } from "@/src/features/notifications/notification-target-row";
import { getNotificationTarget } from "@/src/features/notifications/registry";
import type { ReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import type { ReminderChannelStatus, ReminderScheduleResult } from "@/src/lib/notifications";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

const mockShowToast = jest.fn();

jest.mock("@/src/lib/notifications", () => ({
  getReminderTimeZone: jest.fn().mockReturnValue("Europe/Sofia"),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

const mockUseUpdatePreferences = jest.mocked(useUpdateUserPreferences);
const mockMutateAsync = jest.fn();
const mockEnsure = jest.fn<Promise<ReminderScheduleResult>, []>();
const onRequestChange = jest.fn();

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  mockEnsure.mockResolvedValue({ enabled: true });
  mockUseUpdatePreferences.mockReturnValue({
    isPending: false,
    mutateAsync: mockMutateAsync,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
});

function channel(status: ReminderChannelStatus): ReminderChannel {
  return { status, ensure: mockEnsure };
}

function renderRow({
  status = "granted" as ReminderChannelStatus,
  masterEnabled = true,
  preferences = defaultUserPreferences,
  locked = false,
} = {}) {
  return renderWithProviders(
    <NotificationTargetRow
      target={getNotificationTarget("sleep")}
      preferences={preferences}
      userId="user-1"
      masterEnabled={masterEnabled}
      channel={channel(status)}
      locked={locked}
      onRequestChange={onRequestChange}
    />,
  );
}

describe("NotificationTargetRow - Path A (channel already granted)", () => {
  it("writes the column directly and never touches the channel", async () => {
    renderRow({ status: "granted" });

    await act(async () => {
      fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);
    });

    expect(mockEnsure).not.toHaveBeenCalled();
    // The consent columns ride along: `reminder_consent` is a hard delivery gate that
    // defaults false, so a pure column write has to carry it or the reminder never sends.
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sleepRemindersEnabled: true,
        sleepReminderTimezone: "Europe/Sofia",
        reminderConsent: true,
      }),
    );
    expect(onRequestChange).not.toHaveBeenCalled();
  });

  it("takes Path A when the channel is blocked, because the server reads the columns", async () => {
    renderRow({ status: "blocked" });

    await act(async () => {
      fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);
    });

    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sleepRemindersEnabled: true }),
    );
  });

  it("turning off is a pure column write with no consent change", async () => {
    renderRow({
      status: "prompt-needed",
      preferences: { ...defaultUserPreferences, sleepRemindersEnabled: true },
    });

    await act(async () => {
      fireEvent(screen.getByLabelText("Sleep"), "checkedChange", false);
    });

    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith({ sleepRemindersEnabled: false });
  });
});

describe("NotificationTargetRow - Path B (permission not given yet)", () => {
  it("asks the channel first and writes only after it confirms", async () => {
    renderRow({ status: "prompt-needed" });

    await act(async () => {
      fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);
    });

    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sleepRemindersEnabled: true }),
    );
    // The page is locked for the duration and released afterwards.
    expect(onRequestChange).toHaveBeenNthCalledWith(1, true);
    expect(onRequestChange).toHaveBeenLastCalledWith(false);
  });

  it("writes NOTHING when the request fails, and says why in this platform's words", async () => {
    mockEnsure.mockResolvedValue({ enabled: false, reason: "permission-denied" });
    renderRow({ status: "prompt-needed" });

    await act(async () => {
      fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);
    });

    // No rollback write, because there was never a write: the switch stayed off.
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Sleep").props.accessibilityState.checked).toBe(false);
    // Jest runs the native platform, so the notice must name device settings - an iOS user
    // told to check their "browser" settings is the bug this split fixes.
    const message = "Notifications are turned off for Selftend in your device settings.";
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText("permission-denied")).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "error", description: message }),
    );
  });

  it("shows a spinner in the switch's slot while the request is open", async () => {
    let resolveEnsure: (result: ReminderScheduleResult) => void = () => {};
    mockEnsure.mockReturnValue(
      new Promise((resolve) => {
        resolveEnsure = resolve;
      }),
    );
    renderRow({ status: "prompt-needed" });

    fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);

    await waitFor(() => expect(screen.getByTestId("notification-row-pending-sleep")).toBeTruthy());
    expect(screen.queryByLabelText("Sleep")).toBeNull();

    await act(async () => {
      resolveEnsure({ enabled: true });
    });
    expect(screen.getByLabelText("Sleep")).toBeTruthy();
  });
});

describe("NotificationTargetRow - failure copy (#1064)", () => {
  it("a failed preference write toasts the save sentence once, with no description", async () => {
    mockMutateAsync.mockRejectedValue(new Error("backend string"));
    renderRow({ status: "granted" });

    await act(async () => {
      fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);
    });

    // Title-only: a duplicate description made the toast say the sentence twice and a
    // screen reader hear it three times. A failed toggle IS a failed save, so the title
    // is the save sentence, not the generic one (#1055's distinction).
    expect(mockShowToast).toHaveBeenCalledWith({
      title: "Something did not save",
      tone: "error",
    });
    // The row's own alert line stays as the persistent trace once the toast is gone.
    expect(screen.getByText("Something did not save")).toBeTruthy();
    expect(screen.queryByText("backend string")).toBeNull();
  });

  it("a channel request that throws toasts the generic sentence once, with no description", async () => {
    mockEnsure.mockRejectedValue(new Error("push service exploded"));
    renderRow({ status: "prompt-needed" });

    await act(async () => {
      fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);
    });

    // Nothing was written, so nothing failed to SAVE - this one keeps "went wrong".
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith({
      title: "Something went wrong",
      tone: "error",
    });
    expect(screen.queryByText("push service exploded")).toBeNull();
  });
});

describe("NotificationTargetRow - the time", () => {
  async function pickTime(hour: number, minute: number) {
    fireEvent.press(screen.getByLabelText("Sleep reminder time"));
    fireEvent(
      screen.getByTestId("time-picker-spinner"),
      "change",
      { type: "set" },
      new Date(2026, 0, 1, hour, minute),
    );
    // Scrolling the spinner must not write: the commit boundary is the picker closing.
    expect(mockMutateAsync).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByText("Done"));
    });
  }

  it("writes the columns when the picker closes, never per change", async () => {
    renderRow({ status: "prompt-needed" });

    await pickTime(6, 30);

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      sleepReminderHour: 6,
      sleepReminderMinute: 30,
      sleepReminderTimezone: "Europe/Sofia",
    });
    // A time change is a pure column write on every path - it cannot fail for permission,
    // so it never asks for one.
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it("writes nothing when the picker closes on the time it opened with", async () => {
    renderRow({
      preferences: {
        ...defaultUserPreferences,
        sleepReminderHour: 22,
        sleepReminderMinute: 15,
      },
    });

    await pickTime(22, 15);

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

describe("NotificationTargetRow - state it renders", () => {
  it("shows its true checked state and real time with the master off, and is disabled", () => {
    renderRow({
      masterEnabled: false,
      preferences: {
        ...defaultUserPreferences,
        sleepRemindersEnabled: true,
        sleepReminderHour: 22,
        sleepReminderMinute: 30,
      },
    });

    const control = screen.getByLabelText("Sleep");
    expect(control.props.accessibilityState.checked).toBe(true);
    expect(control.props.accessibilityState.disabled).toBe(true);
    // The real time, not "Off": the row shows what it IS - written the way the
    // locale writes it (en is a 12-hour clock), not in the 24-hour wire format.
    expect(screen.getByText("10:30 PM")).toBeTruthy();
  });

  it("locks out while another control on the page owns the permission prompt", () => {
    renderRow({ locked: true });

    expect(screen.getByLabelText("Sleep").props.accessibilityState.disabled).toBe(true);
  });

  it("names its own control, so ten rows are ten distinguishable switches", () => {
    renderRow();

    expect(screen.getByLabelText("Sleep")).toBeTruthy();
    expect(screen.getByLabelText("Sleep reminder time")).toBeTruthy();
    // The old shared names are gone.
    expect(screen.queryByLabelText("Enable reminders")).toBeNull();
    expect(screen.queryByLabelText("Reminder time")).toBeNull();
  });

  /**
   * jest reports a 750px window and the e2e viewport is Desktop Chrome, so without mocking
   * the dimensions the phone branch ships with zero coverage in both layers - the blind spot
   * #990/#991 were filed for. `Dimensions.get` is read by `useWindowDimensions` at mount, so
   * each width needs its own render.
   */
  it.each([
    [390, "items-start gap-1", "flex-row items-center gap-3"],
    [1280, "flex-row items-center gap-3", "items-start gap-1"],
  ])("at %ipx the row body lays out as %s", (width, expected, notExpected) => {
    const spy = jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width, height: 844, scale: 3, fontScale: 1 });
    try {
      renderRow();
      const body = screen.getByTestId("notification-row-body-sleep");
      expect(body.props.className).toContain(expected);
      expect(body.props.className).not.toContain(notExpected);
      // Both layouts carry the same two controls; only the axis changes.
      expect(screen.getByLabelText("Sleep")).toBeTruthy();
      expect(screen.getByLabelText("Sleep reminder time")).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it("has no Save button and no 'Coming soon' badge left to render", () => {
    renderRow();

    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.queryByText("Coming soon")).toBeNull();
  });
});
