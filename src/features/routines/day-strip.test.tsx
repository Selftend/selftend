import { screen } from "@testing-library/react-native";

import { RoutineDayStrip, type RoutineSchedule } from "@/src/features/routines/day-strip";
import { lastNDayKeys, parseLocalNoon } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

// The strip always shows the last 7 LOCAL days ending today; local-noon
// timestamps keep the derivation deterministic in any timezone.
const dayKeys = lastNDayKeys(7);
const noonOn = (dayKey: string) => `${dayKey}T12:00:00`;

const daily: RoutineSchedule = { cadence: "daily", customDays: [] };

describe("RoutineDayStrip", () => {
  it("renders 7 day cells, filled exactly on the days the routine was complete", () => {
    // Mood logged yesterday (day -1) and three days ago (day -3) only.
    renderWithProviders(
      <RoutineDayStrip
        steps={[{ toolId: "mood" }]}
        records={{
          moodLogs: [{ loggedAt: noonOn(dayKeys[5]) }, { loggedAt: noonOn(dayKeys[3]) }],
        }}
        schedule={daily}
      />,
    );

    expect(screen.getAllByLabelText(/: routine complete$/)).toHaveLength(2);
    // Gaps are plain "not completed" days - no error/negative framing.
    expect(screen.getAllByLabelText(/: not completed$/)).toHaveLength(5);
  });

  it("labels each day with its formatted local date from i18n", () => {
    renderWithProviders(
      <RoutineDayStrip
        steps={[{ toolId: "mood" }]}
        records={{ moodLogs: [{ loggedAt: noonOn(dayKeys[5]) }] }}
        schedule={daily}
      />,
    );

    const dateFormat = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    const completeDay = dateFormat.format(parseLocalNoon(dayKeys[5]));
    expect(screen.getByLabelText(`${completeDay}: routine complete`)).toBeTruthy();
  });

  it("keeps a partially-done day open on a multi-step routine", () => {
    renderWithProviders(
      <RoutineDayStrip
        steps={[{ toolId: "mood" }, { toolId: "journal" }]}
        records={{ moodLogs: [{ loggedAt: noonOn(dayKeys[6]) }] }}
        schedule={daily}
      />,
    );

    expect(screen.queryAllByLabelText(/: routine complete$/)).toHaveLength(0);
    expect(screen.getAllByLabelText(/: not completed$/)).toHaveLength(7);
  });

  it("renders off-days as quieter 'not scheduled' cells, never 'not completed'", () => {
    // A custom cadence scheduled only on today's weekday: the 7-day window
    // covers each weekday exactly once, so the other 6 days are off-days.
    const todayWeekday = parseLocalNoon(dayKeys[6]).getDay();
    renderWithProviders(
      <RoutineDayStrip
        steps={[{ toolId: "mood" }]}
        records={{}}
        schedule={{ cadence: "custom", customDays: [todayWeekday] }}
      />,
    );

    expect(screen.getAllByLabelText(/: not scheduled$/)).toHaveLength(6);
    expect(screen.getAllByLabelText(/: not completed$/)).toHaveLength(1);
    expect(screen.queryAllByLabelText(/: routine complete$/)).toHaveLength(0);
  });

  it("marks weekend days of a weekdays routine as not scheduled", () => {
    // Any 7 consecutive days contain exactly two weekend days.
    renderWithProviders(
      <RoutineDayStrip
        steps={[{ toolId: "mood" }]}
        records={{}}
        schedule={{ cadence: "weekdays", customDays: [] }}
      />,
    );

    expect(screen.getAllByLabelText(/: not scheduled$/)).toHaveLength(2);
    expect(screen.getAllByLabelText(/: not completed$/)).toHaveLength(5);
  });

  it("fills a completed off-day like any other complete day", () => {
    // On-demand routines are never scheduled, but a manual run yesterday
    // still derived complete - completion is an independent fact.
    renderWithProviders(
      <RoutineDayStrip
        steps={[{ toolId: "mood" }]}
        records={{ moodLogs: [{ loggedAt: noonOn(dayKeys[5]) }] }}
        schedule={{ cadence: "on-demand", customDays: [] }}
      />,
    );

    expect(screen.getAllByLabelText(/: routine complete$/)).toHaveLength(1);
    expect(screen.getAllByLabelText(/: not scheduled$/)).toHaveLength(6);
    expect(screen.queryAllByLabelText(/: not completed$/)).toHaveLength(0);
  });
});
