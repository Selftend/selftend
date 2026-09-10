import { render, screen } from "@testing-library/react-native";

import IndexScreen from "@/app/index";
import { setPlatformOS } from "@/test/modal-marker-mock";

/**
 * The index route while the session is still resolving (#2293).
 *
 * The static export writes `/` as the landing page (the session seeds "ready"
 * in Node), so on web the first client render has to be the landing as well:
 * React hydrates the file's body against it, and a spinner there would be a
 * mismatch that throws the server-rendered page away. Native keeps the
 * spinner - there is no file to hydrate and the landing is a different screen.
 */

let mockStatus: "loading" | "ready" = "loading";
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ status: mockStatus, session: null, user: null, hasSupabaseConfig: true }),
}));

jest.mock("expo-router", () => ({
  Redirect: () => null,
}));

jest.mock("@/src/components/app/landing/landing-screen", () => ({
  __esModule: true,
  default: () => {
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text>landing-screen</Text>;
  },
}));

jest.mock("@/src/components/app/auth-landing-screen", () => ({
  AuthLandingScreen: () => {
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text>auth-landing-screen</Text>;
  },
}));

jest.mock("@/src/components/app/screen-state", () => ({
  LoadingState: ({ title }: { title: string }) => {
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text>{`spinner:${title}`}</Text>;
  },
}));

afterEach(() => {
  setPlatformOS("ios");
  mockStatus = "loading";
});

describe("the index route while the session resolves", () => {
  it("web shows the landing page - the face the exported file already carries", () => {
    setPlatformOS("web");

    render(<IndexScreen />);

    expect(screen.getByText("landing-screen")).toBeTruthy();
    expect(screen.queryByText(/^spinner:/)).toBeNull();
  });

  it("native keeps the spinner", () => {
    setPlatformOS("ios");

    render(<IndexScreen />);

    expect(screen.getByText(/^spinner:/)).toBeTruthy();
    expect(screen.queryByText("landing-screen")).toBeNull();
    expect(screen.queryByText("auth-landing-screen")).toBeNull();
  });

  it("once ready and signed out, each platform gets its own landing", () => {
    mockStatus = "ready";

    setPlatformOS("web");
    const web = render(<IndexScreen />);
    expect(screen.getByText("landing-screen")).toBeTruthy();
    web.unmount();

    setPlatformOS("ios");
    render(<IndexScreen />);
    expect(screen.getByText("auth-landing-screen")).toBeTruthy();
  });
});
