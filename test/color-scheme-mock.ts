import type { useColorScheme } from "nativewind";

// A screen that wears a module room reads the active scheme through
// nativewind's useColorScheme (see useRoomScheme in src/lib/use-room-style.ts),
// so asserting the dark pour means steering that one read. Mocking the whole
// module would take the styling interop down with it, so the factory below
// keeps every other export real.
//
// Usage, in a suite that renders a room:
//
//   jest.mock("nativewind", () => require("@/test/color-scheme-mock").nativewindWithMockedScheme());
//   beforeEach(() => setScheme("light"));
//
// jest.mock factories are hoisted above imports, hence the require form.

export function nativewindWithMockedScheme() {
  return {
    ...jest.requireActual("nativewind"),
    useColorScheme: jest.fn(() => ({ colorScheme: "light" })),
  };
}

/** Point the mocked reader at a scheme for the next render. */
export function setScheme(scheme: "light" | "dark") {
  const mocked = jest.requireMock("nativewind") as {
    useColorScheme: jest.MockedFunction<typeof useColorScheme>;
  };
  mocked.useColorScheme.mockReturnValue({ colorScheme: scheme } as ReturnType<
    typeof useColorScheme
  >);
}
