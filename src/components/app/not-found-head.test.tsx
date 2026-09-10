import NotFoundScreen from "@/src/components/app/not-found-screen";
import enNavigation from "@/src/i18n/locales/en/navigation.json";
import { h1Text } from "@/test/h1";
import { meta, reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * `+not-found` is the one route-shaped file that is not a route: it is served
 * for every path off the index list, so it alone carries noindex, and its
 * title follows its H1 through the template like every other screen (#2294,
 * docs/indexability.md § 3, § 4.1).
 */

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  usePathname: () => "/nowhere",
  useSegments: () => ["nowhere"],
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  reset();
  setPlatformOS("web");
});

afterEach(() => {
  setPlatformOS("ios");
});

describe("the not-found screen's head (#2294)", () => {
  it("titles the document from its H1 and carries noindex", () => {
    renderWithProviders(<NotFoundScreen />);

    const h1 = h1Text();
    expect(h1).toBe(enNavigation.notFound.title);
    expect(tags().filter(({ type }) => type === "title")).toEqual([
      { type: "title", props: { children: `${h1} - Selftend` } },
    ]);
    expect(meta("robots").map(({ props }) => props.content)).toEqual(["noindex"]);
  });

  it("is the literal the spec names", () => {
    expect(`${enNavigation.notFound.title} - Selftend`).toBe("Page not found - Selftend");
  });
});
