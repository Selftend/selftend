import { fireEvent, screen } from "@testing-library/react-native";

import { ProgressSegments } from "@/src/components/app/progress-segments";
import { renderWithProviders } from "@/test/render-with-providers";

describe("ProgressSegments in step mode", () => {
  it("exposes each interactive segment to assistive technology", () => {
    const onSelect = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <ProgressSegments total={5} current={2} onSelect={onSelect} />,
    );
    fireEvent.press(getByLabelText("Go to step 4 of 5"));
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});

describe("ProgressSegments in rail mode", () => {
  const STOPS = [
    { label: "The thought", filled: true },
    { label: "Category", filled: false },
    { label: "Before", filled: true },
    { label: "Technique", filled: false },
    { label: "After & notes", filled: false },
  ];
  const NOTE = "2 of 5 parts filled in";

  it("names every part on screen", () => {
    renderWithProviders(<ProgressSegments stops={STOPS} note={NOTE} />);

    for (const stop of STOPS) {
      expect(screen.getByText(stop.label, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it("is read-only - no segment is a button", () => {
    renderWithProviders(<ProgressSegments stops={STOPS} note={NOTE} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("keeps the bars and their captions out of the accessibility tree", () => {
    renderWithProviders(<ProgressSegments stops={STOPS} note={NOTE} />);

    // The default queries skip anything hidden from assistive technology, so a
    // caption that is only findable with includeHiddenElements is a caption a
    // screen reader never reaches. That is the whole contract: the bars are
    // decoration, and the note below carries the meaning.
    expect(screen.queryByText("The thought")).toBeNull();
  });

  it("states where the user is in a sentence assistive technology can read", () => {
    renderWithProviders(<ProgressSegments stops={STOPS} note={NOTE} />);

    expect(screen.getByText(NOTE)).toBeTruthy();
  });
});
