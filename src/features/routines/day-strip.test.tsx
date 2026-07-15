import { screen } from "@testing-library/react-native";

import { RoutineDayStrip } from "@/src/features/routines/day-strip";
import { lastNDayKeys, parseLocalNoon } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

// The strip always shows the last 7 LOCAL days ending today; local-noon
// timestamps keep the derivation deterministic in any timezone.
const dayKeys = lastNDayKeys(7);
const noonOn = (dayKey: string) => `${dayKey}T12:00:00`;

describe("RoutineDayStrip", () => {
  it("renders 7 day cells, filled exactly on the days the routine was complete", () => {
    // Mood logged yesterday (day -1) and three days ago (day -3) only.
    renderWithProviders(
      <RoutineDayStrip
        steps={[{ toolId: "mood" }]}
        records={{
          moodLogs: [{ loggedAt: noonOn(dayKeys[5]) }, { loggedAt: noonOn(dayKeys[3]) }],
        }}
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
      />,
    );

    expect(screen.queryAllByLabelText(/: routine complete$/)).toHaveLength(0);
    expect(screen.getAllByLabelText(/: not completed$/)).toHaveLength(7);
  });
});
