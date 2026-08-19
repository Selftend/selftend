import { screen } from "@testing-library/react-native";

import { AppToast } from "@/src/components/app/app-toast";
import { useToastStore } from "@/src/stores/toast-store";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  useToastStore.setState({ toast: null });
});

describe("AppToast - the accessibility label", () => {
  it("a title-only toast is announced as just the title, with no dangling description", () => {
    useToastStore.getState().showToast({ title: "Something did not save", tone: "error" });
    renderWithProviders(<AppToast />);

    // The label is what a screen reader speaks. A title-only toast (the #1064
    // convention for callers with nothing specific to add) must not read
    // "Something did not save. undefined" - or the sentence twice.
    const toast = screen.getByTestId("app-toast");
    expect(toast.props.accessibilityLabel).toBe("Something did not save");
    expect(screen.queryByText("undefined")).toBeNull();
  });

  it("a toast with a description speaks both sentences once each", () => {
    useToastStore.getState().showToast({
      title: "Something went wrong",
      description: "Notifications are blocked.",
      tone: "error",
    });
    renderWithProviders(<AppToast />);

    expect(screen.getByTestId("app-toast").props.accessibilityLabel).toBe(
      "Something went wrong. Notifications are blocked.",
    );
  });
});
