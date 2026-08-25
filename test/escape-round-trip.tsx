import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import { renderWithProviders } from "@/test/render-with-providers";

interface EscapeRoundTrip {
  /**
   * Puts the test on `pathname`, as the arrival would.
   *
   * Passed in rather than owned here because the pathname is file-local state:
   * each suite mocks `expo-router` itself and closes `usePathname` over its own
   * `let mockPathname`. A caller hands over `(pathname) => { mockPathname = pathname; }`.
   */
  arriveAt: (pathname: string) => void;
  /** Where the push landed - the screen whose Escape is under test. */
  destination: string;
  /** What the Escape should call the Origin, read off the route map (O6). */
  name: string;
  /** Where the Escape should actually go: the screen the user left. */
  origin: string;
}

/**
 * The other end of a recorded Origin: arrive, and check the Escape both names
 * where you came from and goes there (#1261 R2/R5, #1265, #1266).
 *
 * Recording is only half of the rule, and it is the half that is cheap to
 * assert - `useNavigationOriginStore.getState().pending` after a press. The
 * half that matters to the user is this one, and it only shows up by mounting
 * the destination's chrome against the real route map: a recorded Origin the
 * route map cannot name renders no name at all, and one whose pathname does not
 * match `usePathname()` silently never matches and quietly shows Up.
 *
 * ⚠️ Call this only *after* unmounting the departing screen. The Origin is
 * consumed on mount, and leaving the previous tree rendered lets `getByText`
 * match a leftover node from a screen the user has already left - which would
 * pass without the Escape ever having read anything.
 *
 * Extracted after the fourth copy: crisis support (#1265), and ACT's related
 * tools, CBT self-care and the shared-tool chips (#1266).
 */
export function expectEscapeReturnsTo({ arriveAt, destination, name, origin }: EscapeRoundTrip) {
  arriveAt(destination);
  renderWithProviders(<ScreenEscape />);

  expect(screen.getByText(name)).toBeTruthy();
  fireEvent.press(screen.getByLabelText(`Back to ${name}`));
  expect(router.replace).toHaveBeenCalledWith(origin);
}
