import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { GratitudeEntryEditorScreen } from "@/src/features/gratitude/gratitude-entry-editor-screen";
import {
  useGratitudeEntries,
  useGratitudeEntry,
  useSaveGratitudeEntry,
} from "@/src/features/gratitude/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/gratitude-log/new",
}));

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  useGratitudeEntries: jest.fn(),
  useGratitudeEntry: jest.fn(),
  useSaveGratitudeEntry: jest.fn(),
}));

const mockUseGratitudeEntries = useGratitudeEntries as jest.MockedFunction<
  typeof useGratitudeEntries
>;
const mockUseGratitudeEntry = useGratitudeEntry as jest.MockedFunction<typeof useGratitudeEntry>;
const mockUseSaveGratitudeEntry = useSaveGratitudeEntry as jest.MockedFunction<
  typeof useSaveGratitudeEntry
>;

describe("GratitudeEntryEditorScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGratitudeEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useGratitudeEntries
    >);
    mockUseGratitudeEntry.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
      typeof useGratitudeEntry
    >);
  });

  it("renders three open lines with only the first full placeholder", () => {
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveGratitudeEntry>);

    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="create" />,
    );

    expect(screen.getByText("Three good things")).toBeTruthy();
    expect(screen.getByLabelText("Gratitude 1")).toBeTruthy();
    expect(screen.getByLabelText("Gratitude 2")).toBeTruthy();
    expect(screen.getByLabelText("Gratitude 3")).toBeTruthy();
    expect(screen.queryByLabelText("Gratitude 4")).toBeNull();
    expect(screen.getByPlaceholderText("Something small that mattered today")).toBeTruthy();
    expect(screen.getAllByPlaceholderText("…")).toHaveLength(2);
    expect(screen.queryByLabelText("Note (optional)")).toBeNull();
    expect(screen.getByText("Save entry")).toBeTruthy();
  });

  it("adds open lines up to five", () => {
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as never);
    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="create" />,
    );

    fireEvent.press(screen.getByText("Add another"));
    fireEvent.press(screen.getByText("Add another"));

    expect(screen.getByLabelText("Gratitude 5")).toBeTruthy();
    expect(screen.queryByText("Add another")).toBeNull();
  });

  it("fills the focused empty line from a prompt without overwriting text", () => {
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as never);
    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="create" />,
    );
    fireEvent.changeText(screen.getByLabelText("Gratitude 1"), "Already here");
    fireEvent(screen.getByLabelText("Gratitude 2"), "focus");
    fireEvent.press(screen.getByText("What made you laugh?"));

    expect(screen.getByDisplayValue("Already here")).toBeTruthy();
    expect(screen.getByDisplayValue("What made you laugh?")).toBeTruthy();
  });

  it("saves a new entry when at least one item is provided", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      id: "g-1",
      userId: "user-1",
      level: 3,
      items: ["Warm coffee"],
      events: [],
      goodMoment: "",
      missIfGone: "",
      hiddenGood: "",
      lifeItems: [],
      starred: false,
      note: "",
      loggedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveGratitudeEntry>);

    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="create" />,
    );

    fireEvent.changeText(screen.getByLabelText("Gratitude 1"), "Warm coffee");
    fireEvent.press(screen.getByText("Save entry"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        input: {
          level: 3,
          items: ["Warm coffee", "", ""],
          note: "",
          loggedAt: expect.any(String),
          loggedOffsetMinutes: expect.any(Number),
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems: ["", "", ""],
        },
        entryId: undefined,
      }),
    );
  });

  it("saves exactly once when Save is pressed twice rapidly", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      id: "g-1",
      userId: "user-1",
      level: 3,
      items: ["Warm coffee"],
      events: [],
      goodMoment: "",
      missIfGone: "",
      hiddenGood: "",
      lifeItems: [],
      starred: false,
      note: "",
      loggedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync,
      isPending: false, // isPending has not re-rendered between the two presses
    } as unknown as ReturnType<typeof useSaveGratitudeEntry>);

    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="create" />,
    );

    fireEvent.changeText(screen.getByLabelText("Gratitude 1"), "Warm coffee");
    fireEvent.press(screen.getByText("Save entry"));
    fireEvent.press(screen.getByText("Save entry"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("preserves the answered slot positionally when saving", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      id: "g-2",
      userId: "user-1",
      level: 3,
      items: ["", "Sunlight", "", "", ""],
      events: [],
      goodMoment: "",
      missIfGone: "",
      hiddenGood: "",
      lifeItems: ["", "", ""],
      starred: false,
      note: "Small thing.",
      loggedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveGratitudeEntry>);

    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="create" />,
    );

    fireEvent.changeText(screen.getByLabelText("Gratitude 2"), "Sunlight");
    fireEvent.press(screen.getByText("Save entry"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        input: {
          level: 3,
          items: ["", "Sunlight", ""],
          note: "",
          loggedAt: expect.any(String),
          loggedOffsetMinutes: expect.any(Number),
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems: ["", "", ""],
        },
        entryId: undefined,
      }),
    );
  });

  it("prefills edit lines and preserves hidden legacy content on save", async () => {
    mockUseGratitudeEntries.mockReturnValue({
      data: [
        {
          id: "g-9",
          userId: "user-1",
          level: 3,
          items: ["A quiet walk", "A kind message"],
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems: [],
          starred: false,
          note: "This helped.",
          loggedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    } as unknown as ReturnType<typeof useGratitudeEntries>);
    const mutateAsync = jest.fn().mockResolvedValue({ id: "g-9" });
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveGratitudeEntry>);

    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="edit" entryId="g-9" />,
    );

    expect(screen.getByText("Edit gratitude entry")).toBeTruthy();
    expect(screen.getByDisplayValue("A quiet walk")).toBeTruthy();
    expect(screen.getByDisplayValue("A kind message")).toBeTruthy();
    expect(screen.getByText("Update")).toBeTruthy();
    expect(screen.queryByDisplayValue("This helped.")).toBeNull();

    fireEvent.press(screen.getByText("Update"));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: "g-9",
          input: expect.objectContaining({ note: "This helped." }),
        }),
      ),
    );
  });
});
