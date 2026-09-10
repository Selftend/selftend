import { render } from "@testing-library/react-native";

// Initialises i18next, whose `navigation` namespace holds the app name.
import "@/src/i18n";
import enNavigation from "@/src/i18n/locales/en/navigation.json";
import { meta, rendered, reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";

import { SiteDocumentTitle } from "./site-document-title";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

beforeEach(() => {
  reset();
  setPlatformOS("web");
});

afterEach(() => {
  setPlatformOS("ios");
});

describe("SiteDocumentTitle (#2294)", () => {
  // The gated tree's placeholder: the site name alone, never through the page
  // template (there is no page to name yet), and never a description or a
  // robots tag - those are a route's own.
  it("is the site name, and only that", () => {
    render(<SiteDocumentTitle />);

    expect(tags().filter(({ type }) => type === "title")).toEqual([
      { type: "title", props: { children: enNavigation.header.appName } },
    ]);
    expect(enNavigation.header.appName).toBe("Selftend");
    expect(meta("description")).toEqual([]);
    expect(meta("robots")).toEqual([]);
  });

  it("renders nothing off web", () => {
    setPlatformOS("ios");

    render(<SiteDocumentTitle />);

    expect(rendered()).toBe(false);
  });
});
