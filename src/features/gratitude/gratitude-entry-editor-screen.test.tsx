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

  it("renders create mode with gratitude item and note fields", () => {
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveGratitudeEntry>);

    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="create" />,
    );

    expect(screen.getByText("New gratitude entry")).toBeTruthy();
    expect(screen.getByLabelText("Gratitude 1")).toBeTruthy();
    expect(screen.getByLabelText("Gratitude 2")).toBeTruthy();
    expect(screen.getByLabelText("Gratitude 5")).toBeTruthy();
    expect(screen.getByLabelText("Note (optional)")).toBeTruthy();
    expect(screen.getByText("Save")).toBeTruthy();
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
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        input: {
          level: 3,
          items: ["Warm coffee"],
          note: "",
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems: [],
        },
        entryId: undefined,
      }),
    );
  });

  it("filters blank items before saving", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      id: "g-2",
      userId: "user-1",
      level: 3,
      items: ["Sunlight"],
      events: [],
      goodMoment: "",
      missIfGone: "",
      hiddenGood: "",
      lifeItems: [],
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
    fireEvent.changeText(screen.getByLabelText("Note (optional)"), "Small thing.");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        input: {
          level: 3,
          items: ["Sunlight"],
          note: "Small thing.",
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems: [],
        },
        entryId: undefined,
      }),
    );
  });

  it("prefills fields in edit mode from cache", () => {
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
    mockUseSaveGratitudeEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveGratitudeEntry>);

    renderWithProviders(
      <GratitudeEntryEditorScreen fallbackHref="/tools/gratitude-log" mode="edit" entryId="g-9" />,
    );

    expect(screen.getByText("Edit gratitude entry")).toBeTruthy();
    expect(screen.getByDisplayValue("A quiet walk")).toBeTruthy();
    expect(screen.getByDisplayValue("A kind message")).toBeTruthy();
    expect(screen.getByDisplayValue("This helped.")).toBeTruthy();
    expect(screen.getByText("Update")).toBeTruthy();
  });
});
