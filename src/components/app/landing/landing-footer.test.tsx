import { fireEvent, screen } from "@testing-library/react-native";

import { LandingFooter } from "./landing-footer";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    // Mirror Link asChild: forward the href onto the wrapped pressable so
    // tests can assert real link targets instead of spying on router.push.
    Link: ({
      href,
      asChild: _asChild,
      children,
    }: {
      href: string;
      asChild?: boolean;
      children: React.ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
  };
});

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

// ☠️ This factory REPLACES `appEnv`, it does not extend it: a URL the footer
// reads and this object omits arrives as `undefined`, which is falsy, so the
// link would simply never render and a presence test would fail for a reason
// that has nothing to do with the component.
jest.mock("@/src/lib/env", () => ({
  appEnv: {
    discordUrl: "https://discord.gg/pdaAr9FhcQ",
    redditUrl: "https://www.reddit.com/r/Selftend/",
    youtubeUrl: "https://www.youtube.com/@Selftend",
  },
}));

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

function linkHref(name: string) {
  return screen.getByRole("link", { name }).props.href as string;
}

beforeEach(() => {
  appEnv.discordUrl = "https://discord.gg/pdaAr9FhcQ";
  appEnv.redditUrl = "https://www.reddit.com/r/Selftend/";
  appEnv.youtubeUrl = "https://www.youtube.com/@Selftend";
  jest.clearAllMocks();
});

describe("LandingFooter", () => {
  it("shows the full safety disclaimer", () => {
    renderWithProviders(<LandingFooter />);

    expect(
      screen.getByText(
        "Selftend is a set of mental health tools for when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders.",
      ),
    ).toBeTruthy();
  });

  it("links to crisis guidance", () => {
    renderWithProviders(<LandingFooter />);

    expect(linkHref("Open crisis guidance")).toBe("/crisis");
  });

  it("links to the terms, privacy, and cookie policies", () => {
    renderWithProviders(<LandingFooter />);

    expect(linkHref("Terms of service")).toBe("/terms");
    expect(linkHref("Privacy policy")).toBe("/privacy");
    expect(linkHref("Cookie policy")).toBe("/cookies");
  });

  it("links to the FAQ", () => {
    renderWithProviders(<LandingFooter />);

    expect(linkHref("FAQ")).toBe("/faq");
  });

  it("opens Discord externally when appEnv.discordUrl is set", () => {
    renderWithProviders(<LandingFooter />);

    fireEvent.press(screen.getByText("Join our Discord"));

    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/pdaAr9FhcQ");
  });

  it("hides the Discord link when appEnv.discordUrl is empty", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<LandingFooter />);

    expect(screen.queryByText("Join our Discord")).toBeNull();
  });

  it("opens the subreddit externally when appEnv.redditUrl is set", () => {
    renderWithProviders(<LandingFooter />);

    fireEvent.press(screen.getByText("Join r/Selftend"));

    expect(mockOpen).toHaveBeenCalledWith("https://www.reddit.com/r/Selftend/");
  });

  it("hides the subreddit link when appEnv.redditUrl is empty, keeping Discord", () => {
    appEnv.redditUrl = "";

    renderWithProviders(<LandingFooter />);

    expect(screen.queryByText("Join r/Selftend")).toBeNull();
    expect(screen.getByText("Join our Discord")).toBeTruthy();
  });

  it("opens the YouTube channel externally when appEnv.youtubeUrl is set", () => {
    renderWithProviders(<LandingFooter />);

    fireEvent.press(screen.getByText("Watch on YouTube"));

    expect(mockOpen).toHaveBeenCalledWith("https://www.youtube.com/@Selftend");
  });

  it("hides the YouTube link when appEnv.youtubeUrl is empty, keeping its neighbours", () => {
    appEnv.youtubeUrl = "";

    renderWithProviders(<LandingFooter />);

    expect(screen.queryByText("Watch on YouTube")).toBeNull();
    expect(screen.getByText("Join our Discord")).toBeTruthy();
    expect(screen.getByText("Join r/Selftend")).toBeTruthy();
  });

  it("closes the row with Discord, the subreddit, then YouTube, after the policy links", () => {
    renderWithProviders(<LandingFooter />);

    // Order is the assertion: all three are external buttons appended to the
    // same wrapping row, so any of them could land anywhere in it and still be
    // found by the presence checks above. `getAllByText` returns tree order.
    expect(screen.getAllByText(/^(Join|Watch) /).map((node) => node.props.children)).toEqual([
      "Join our Discord",
      "Join r/Selftend",
      "Watch on YouTube",
    ]);
  });
});
