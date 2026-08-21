import { act, screen, within } from "@testing-library/react-native";
import dayjs from "dayjs";

import i18n from "@/src/i18n";

/**
 * Helpers for any test that puts the REAL `react-native-ui-datepicker` in the
 * tree — the calendar wrapper's own tests and each field that renders through
 * it.
 *
 * Both exist because asserting these things on PROPS does not work. The mood
 * tracker's range picker passed `locale` correctly for months and still opened
 * Sunday-first, because the library hard-defaults `firstDayOfWeek` and never
 * derives it from `locale`. So the calendar's language and week start are read
 * off rendered output, which needs the real library, which drags in the global
 * mutation below.
 */

/**
 * Contain the library's global `dayjs.locale()` mutation, which it performs on
 * every render (`utils.getWeekdays`).
 *
 * ⚠️ That mutation is inert in the app only because every user-facing date
 * string is formatted through `Intl` (`src/utils/date.ts`) and never through
 * dayjs. Inside one test file it is not inert at all: a Bulgarian render leaks
 * straight into the next test, and any dayjs formatting there silently
 * inherits Bulgarian. Call once at the top of such a file.
 */
export function isolateCalendarLocale() {
  let localeBeforeTest: string;

  beforeEach(() => {
    localeBeforeTest = dayjs.locale();
  });

  afterEach(async () => {
    dayjs.locale(localeBeforeTest);
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });
}

/** The weekday header's labels, left to right, as rendered. */
export function weekdayLabels(): string[] {
  return within(screen.getByTestId("weekdays"))
    .getAllByText(/\S/)
    .map((node) => node.props.children as string);
}
