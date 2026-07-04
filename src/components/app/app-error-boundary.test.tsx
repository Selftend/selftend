import { screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppErrorBoundary } from "@/src/components/app/app-error-boundary";
import { captureError } from "@/src/lib/sentry";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

function Bomb(): never {
  throw new Error("boundary test crash");
}

describe("AppErrorBoundary", () => {
  it("reports the caught error and renders the fallback", () => {
    // React logs caught boundary errors; keep the test output quiet.
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );

    expect(captureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boundary test crash" }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it("renders children when nothing throws", () => {
    renderWithProviders(
      <AppErrorBoundary>
        <Text>content</Text>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("content")).toBeTruthy();
  });
});
