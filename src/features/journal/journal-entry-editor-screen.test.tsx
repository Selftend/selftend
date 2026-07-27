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
import { expectRoomPour } from "@/test/room-pour";

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

  it("renders the ink field header in create mode on the room pour", () => {
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(<JournalEntryEditorScreen fallbackHref="/tools/journal" mode="create" />);

    // Create mode gets the full-bleed ink field with the sheet lip.
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // The room wrapper carries the ink re-pour; a wrong or missing room fails here.
    expectRoomPour(screen.getByTestId("journal-editor-room"), "ink");
  });

  it("keeps the compact header (no field) on the room pour in edit mode", () => {
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-1",
          userId: "user-1",
          title: "Quiet morning",
          body: "Walked outside.",
          createdAt: "2026-05-24T08:00:00.000Z",
          updatedAt: "2026-05-24T08:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);

    renderWithProviders(
      <JournalEntryEditorScreen fallbackHref="/tools/journal" mode="edit" entryId="j-1" />,
    );

    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    expect(screen.getByText("Edit journal entry")).toBeTruthy();
    expectRoomPour(screen.getByTestId("journal-editor-room"), "ink");
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
        input: {
          title: "",
          body: "Hello world",
          occurredAt: expect.any(String),
          occurredOffsetMinutes: expect.any(Number),
        },
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

  it("includes the entry's occurrence time in the save input on edit", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      id: "j-9",
      userId: "user-1",
      title: "Yesterday",
      body: "I rested.",
      createdAt: "2026-05-10T08:00:00.000Z",
      updatedAt: new Date().toISOString(),
    });
    mockUseJournalEntries.mockReturnValue({
      data: [
        {
          id: "j-9",
          userId: "user-1",
          title: "Yesterday",
          body: "I rested.",
          createdAt: "2026-05-10T08:00:00.000Z",
          updatedAt: "2026-05-10T08:00:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useJournalEntries>);
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(
      <JournalEntryEditorScreen fallbackHref="/tools/journal" mode="edit" entryId="j-9" />,
    );

    fireEvent.press(screen.getByText("Update"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        input: {
          title: "Yesterday",
          body: "I rested.",
          occurredAt: "2026-05-10T08:00:00.000Z",
          // The fixture entry carries no captured offset, and an edit that does not
          // touch the time must not invent one (#250).
          occurredOffsetMinutes: null,
        },
        entryId: "j-9",
      }),
    );
  });

  it("saves exactly once when Save is pressed twice rapidly", async () => {
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
      isPending: false, // isPending has not re-rendered between the two presses
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(<JournalEntryEditorScreen fallbackHref="/tools/journal" mode="create" />);

    fireEvent.changeText(screen.getByLabelText("Body"), "Hello world");
    fireEvent.press(screen.getByText("Save"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error under Body and does not save when the body is empty", async () => {
    const mutateAsync = jest.fn();
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(<JournalEntryEditorScreen fallbackHref="/tools/journal" mode="create" />);

    // Save stays enabled; pressing it with an empty body surfaces the inline error.
    fireEvent.press(screen.getByText("Save"));

    expect(await screen.findByText("Write a line or two before saving.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows the generic save error and not the raw backend message on failure", async () => {
    const mutateAsync = jest
      .fn()
      .mockRejectedValue(new Error("violates check constraint journal_entries_body_not_blank"));
    mockUseSaveJournalEntry.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveJournalEntry>);

    renderWithProviders(<JournalEntryEditorScreen fallbackHref="/tools/journal" mode="create" />);

    fireEvent.changeText(screen.getByLabelText("Body"), "Hello world");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(screen.getByText("Couldn't save your entry. Try again.")).toBeTruthy(),
    );
    expect(screen.queryByText(/journal_entries_body_not_blank/)).toBeNull();
  });
});
