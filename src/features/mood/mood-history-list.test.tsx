import { SectionList } from "react-native";

import { MoodHistoryList } from "@/src/features/mood/mood-history-list";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [], isLoading: false }),
}));

describe("MoodHistoryList", () => {
  // Regression guard: SectionList is not cssInterop-registered by NativeWind, so
  // `contentContainerClassName` is silently dropped and the screen loses its
  // padding. The padding must be applied via `contentContainerStyle` instead.
  it("pads the SectionList content container via contentContainerStyle", () => {
    const { UNSAFE_getByType } = renderWithProviders(<MoodHistoryList logs={[]} />);

    const list = UNSAFE_getByType(SectionList);

    expect(list.props.contentContainerStyle).toEqual({ flexGrow: 1, padding: 16 });
    expect(list.props.contentContainerClassName).toBeUndefined();
  });
});
