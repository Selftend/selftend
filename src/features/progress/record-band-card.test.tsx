import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { RecordBandCard } from "@/src/features/progress/record-band-card";
import * as progressRepo from "@/src/features/progress/repository";
import { renderWithProviders } from "@/test/render-with-providers";

const mockScrollTo = jest.fn();

/*
 * The opening scroll goes through the ScrollView's imperative handle, which the
 * test renderer cannot reach from outside the card - so the mock captures the
 * ref and exposes `scrollTo` as a spy. Same react-native Proxy shape
 * `notifications-screen.test.tsx` uses for its arrival scroll.
 */
jest.mock("react-native", () => {
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual("react-native");
  const MockScrollView = React.forwardRef(function MockScrollView(
    props: { children?: React.ReactNode },
    ref: React.Ref<{ scrollTo: typeof mockScrollTo }>,
  ) {
    React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return React.createElement(actual.View, props, props.children);
  });

  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "ScrollView") {
        return MockScrollView;
      }

      return Reflect.get(target, prop, receiver);
    },
  });
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

// Only the network edge is mocked: `useRecordDays` and `buildRecordBand` run for
// real, so an axis that stops reaching the strip fails here rather than passing
// against a stubbed band.
jest.mock("@/src/features/progress/repository", () => ({
  listRecordDays: jest.fn(),
  viewerOffsetMinutes: jest.fn(() => 330),
}));

const mockListRecordDays = jest.mocked(progressRepo.listRecordDays);

const NOW = new Date("2026-09-04T12:00:00");
const VIEWPORT = 200;

/**
 * ☠️☠️ **The strip opens on the LAST MARK, never at the end of the axis
 * (#2344).** The axis runs to today whether or not anything was recorded on it,
 * so `scrollToEnd` put the only mark of someone who recorded once and came back
 * later off-screen to the left - with `showsHorizontalScrollIndicator={false}`,
 * nothing said so. A card titled "Your days" showing a blank strip under a
 * month label is the exact false absence the card exists to prevent.
 */
describe("RecordBandCard opening position", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function openStrip(dayKeys: string[]) {
    mockListRecordDays.mockResolvedValue(dayKeys);
    renderWithProviders(<RecordBandCard />);
    await waitFor(() => expect(screen.queryByTestId("record-band")).not.toBeNull());
    return screen.getByTestId("record-band-scroll");
  }

  function layout(strip: ReturnType<typeof screen.getByTestId>, width = VIEWPORT) {
    fireEvent(strip, "layout", { nativeEvent: { layout: { width, height: 40 } } });
  }

  /**
   * The case the fix exists for: the record ends on 1 August and the axis runs
   * on to 4 September, so the last mark sits 308px along a 478px axis. Opening
   * at the end would have shown the 170px after it and nothing else.
   */
  it("brings the last mark to the right edge when the record ends early", async () => {
    const strip = await openStrip(["2026-06-01", "2026-08-01"]);

    layout(strip);
    fireEvent(strip, "contentSizeChange", 478, 40);

    // 1 August is day 61 of an axis anchored on 1 June: 61 * 5 + 3 = 308px, less
    // the 200px viewport. The mark lands ON the right edge, not past it.
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 108, animated: false });
  });

  /**
   * ⚠️ For someone recording regularly the last mark IS today, so this is the
   * old behaviour in spirit - it differs only by the `tail`, the room reserved
   * for the final month label to finish, which `scrollToEnd` used to leave
   * showing after today's mark.
   */
  it("puts today's mark on the right edge for someone recording up to today", async () => {
    const strip = await openStrip(["2026-03-12", "2026-09-04"]);

    layout(strip);

    // 4 September is day 176 from 12 March: 176 * 5 + 3 = 883px of axis, less
    // the viewport. `scrollToEnd` would have added the 82px label tail on top.
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 683, animated: false });
  });

  /**
   * An early mark is put at the LEFT edge rather than scrolling the strip
   * backwards past its own start - the clamp is what keeps a short axis, the
   * 8px band included, sitting where the eye already is.
   */
  it("leaves a strip narrower than the card at its start", async () => {
    const strip = await openStrip(["2026-09-03", "2026-09-04"]);

    layout(strip);

    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
  });

  /**
   * ⚠️ Either event alone is half the input, and their order is not guaranteed:
   * content size with no measured viewport cannot place anything, so it must
   * wait rather than scroll to a computed-from-zero offset - which would be the
   * end of the axis again, the exact bug being fixed.
   */
  it("scrolls nothing until the viewport has been measured", async () => {
    const strip = await openStrip(["2026-06-01", "2026-08-01"]);

    fireEvent(strip, "contentSizeChange", 478, 40);
    expect(mockScrollTo).not.toHaveBeenCalled();

    layout(strip);
    expect(mockScrollTo).toHaveBeenCalledWith({ x: 108, animated: false });
  });
});
