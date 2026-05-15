import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { JournalEntryEditorScreen } from "@/src/features/journal/journal-entry-editor-screen";
import {
  useJournalEntries,
  useJournalEntry,
  useSaveJournalEntry,
} from "@/src/features/journal/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  usePathname: () => "/tools/journal/new",
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

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
  useJournalEntry: jest.fn(),
  useSaveJournalEntry: jest.fn(),
}));

const mockUseJournalEntries = useJournalEntries as jest.MockedFunction<typeof useJournalEntries>;
const mockUseJournalEntry = useJournalEntry as jest.MockedFunction<typeof useJournalEntry>;
const mockUseSaveJournalEntry = useSaveJournalEntry as jest.MockedFunction<
  typeof useSaveJournalEntry
>;

describe("JournalEntryEditorScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseJournalEntries.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useJournalEntries
    >);
    mockUseJournalEntry.mockReturnValue({ data: null, isLoading: false } as unknown as ReturnType<
      typeof useJournalEntry
    >);
  });

  it("renders create mode with title and body fields", () => {
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(<JournalEntryEditorScreen fallbackHref="/tools/journal" mode="create" />);

    expect(screen.getByText("New journal entry")).toBeTruthy();
    expect(screen.getByLabelText("Title (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Body")).toBeTruthy();
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("saves a new entry when body is provided", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      id: "j-1",
      userId: "user-1",
      title: "",
      body: "Hello world",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(<JournalEntryEditorScreen fallbackHref="/tools/journal" mode="create" />);

    fireEvent.changeText(screen.getByLabelText("Body"), "Hello world");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        input: { title: "", body: "Hello world" },
        entryId: undefined,
      }),
    );
  });

  it("prefills fields in edit mode from cache", () => {
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-9",
          userId: "user-1",
          title: "Yesterday",
          body: "I rested.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(
      <JournalEntryEditorScreen fallbackHref="/tools/journal" mode="edit" entryId="j-9" />,
    );

    expect(screen.getByText("Edit journal entry")).toBeTruthy();
    expect(screen.getByDisplayValue("Yesterday")).toBeTruthy();
    expect(screen.getByDisplayValue("I rested.")).toBeTruthy();
    expect(screen.getByText("Update")).toBeTruthy();
  });
});
