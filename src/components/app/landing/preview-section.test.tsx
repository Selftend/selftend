import { act, fireEvent, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Image, Platform } from "react-native";

import { PreviewSection } from "./preview-section";
import { renderWithProviders } from "@/test/render-with-providers";

// Render and flush useReduceMotionEnabled's initial AccessibilityInfo probe
// inside act(), so its async setState doesn't fire outside an act() boundary.
async function renderPreviewSection() {
  renderWithProviders(<PreviewSection />);
  await act(async () => {
    await Promise.resolve();
  });
}

// Slides only mount as a track once the frame has been measured, so most tests
// fire a layout event on the frame first.
function layoutFrame(width = 280) {
  fireEvent(screen.getByTestId("preview-carousel-frame"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width, height: width / (402 / 874) } },
  });
}

// Slide views carry aria-hidden, which hides them from RNTL's default queries.
function getSlide(n: number) {
  return screen.getByTestId(`preview-slide-${n}`, { includeHiddenElements: true });
}

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

describe("PreviewSection", () => {
  it("renders the section heading", async () => {
    await renderPreviewSection();

    expect(screen.getByRole("heading", { name: "A calm, uncluttered space" })).toBeTruthy();
  });

  it("shows only the first screenshot until the frame is measured", async () => {
    await renderPreviewSection();

    const images = screen.UNSAFE_getAllByType(Image);
    expect(images.length).toBe(1);
    expect(images[0].props.accessibilityLabel).toBe(
      "Screenshot of the dashboard, showing today's mood and quick access to tools.",
    );
  });

  it("renders all three screenshots once the frame is measured", async () => {
    await renderPreviewSection();
    layoutFrame();

    const images = screen.UNSAFE_getAllByType(Image);
    expect(images.length).toBe(3);
    for (const image of images) {
      expect(typeof image.props.accessibilityLabel).toBe("string");
      expect(image.props.accessibilityLabel.length).toBeGreaterThan(0);
    }
  });

  it("hides inactive slides from accessibility", async () => {
    await renderPreviewSection();
    layoutFrame();

    expect(getSlide(1).props["aria-hidden"]).toBe(false);
    expect(getSlide(2).props["aria-hidden"]).toBe(true);
    expect(getSlide(3).props["aria-hidden"]).toBe(true);
  });

  it("loops with next/previous and never disables the chevrons", async () => {
    await renderPreviewSection();
    layoutFrame();

    const prev = screen.getByLabelText("Previous screenshot");
    const next = screen.getByLabelText("Next screenshot");
    expect(prev).not.toBeDisabled();
    expect(next).not.toBeDisabled();

    fireEvent.press(next);
    expect(getSlide(2).props["aria-hidden"]).toBe(false);
    fireEvent.press(next);
    expect(getSlide(3).props["aria-hidden"]).toBe(false);

    // Last -> next wraps to the first slide instead of disabling.
    fireEvent.press(next);
    expect(getSlide(1).props["aria-hidden"]).toBe(false);

    // First -> previous wraps back to the last slide.
    fireEvent.press(prev);
    expect(getSlide(3).props["aria-hidden"]).toBe(false);

    expect(screen.getByLabelText("Previous screenshot")).not.toBeDisabled();
    expect(screen.getByLabelText("Next screenshot")).not.toBeDisabled();
  });

  it("jumps directly to a slide via its dot and marks it current", async () => {
    await renderPreviewSection();
    layoutFrame();

    fireEvent.press(screen.getByLabelText("Show screenshot 2 of 3"));

    expect(getSlide(2).props["aria-hidden"]).toBe(false);
    // Dots indicate the CURRENT slide (aria-current), not a selected toggle.
    expect(screen.getByLabelText("Show screenshot 2 of 3").props["aria-current"]).toBe("true");
    expect(screen.getByLabelText("Show screenshot 1 of 3").props["aria-current"]).toBeUndefined();
  });

  it("exposes the group wrapper, chevron, and dot labels", async () => {
    await renderPreviewSection();
    layoutFrame();

    // The wrapper region carries the section title as its accessible name.
    expect(screen.getByLabelText("A calm, uncluttered space")).toBeTruthy();
    expect(screen.getByLabelText("Previous screenshot")).toBeTruthy();
    expect(screen.getByLabelText("Next screenshot")).toBeTruthy();
    for (let n = 1; n <= 3; n += 1) {
      expect(screen.getByLabelText(`Show screenshot ${n} of 3`)).toBeTruthy();
    }
  });

  it("announces user-initiated slide changes on native", async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});

    await renderPreviewSection();
    layoutFrame();
    fireEvent.press(screen.getByLabelText("Next screenshot"));

    expect(announceSpy).toHaveBeenCalledWith(
      "Screenshot 2 of 3. Screenshot of a thought record step, walking through examining a thought.",
    );
    announceSpy.mockRestore();
  });
});

describe("PreviewSection - web", () => {
  beforeEach(() => {
    setPlatform("web");
  });

  afterEach(() => {
    setPlatform("ios");
  });

  it("marks the wrapper as a carousel and announces via the polite live region", async () => {
    await renderPreviewSection();
    layoutFrame();

    const wrapper = screen.getByLabelText("A calm, uncluttered space");
    expect(wrapper.props["aria-roledescription"]).toBe("carousel");

    fireEvent.press(screen.getByLabelText("Next screenshot"));

    expect(
      screen.getByText(
        "Screenshot 2 of 3. Screenshot of a thought record step, walking through examining a thought.",
        { includeHiddenElements: true },
      ),
    ).toBeTruthy();
  });

  it("navigates with arrow keys, wrapping in both directions", async () => {
    await renderPreviewSection();
    layoutFrame();

    const wrapper = screen.getByLabelText("A calm, uncluttered space");

    fireEvent(wrapper, "keyDown", { key: "ArrowRight", preventDefault: jest.fn() });
    expect(getSlide(2).props["aria-hidden"]).toBe(false);

    fireEvent(wrapper, "keyDown", { key: "ArrowLeft", preventDefault: jest.fn() });
    fireEvent(wrapper, "keyDown", { key: "ArrowLeft", preventDefault: jest.fn() });
    expect(getSlide(3).props["aria-hidden"]).toBe(false);
  });
});
