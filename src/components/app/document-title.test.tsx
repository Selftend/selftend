import { render } from "@testing-library/react-native";

// Initialises i18next, whose `common` namespace holds the template.
import "@/src/i18n";
import { meta, rendered, reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";

import { DocumentTitle } from "./document-title";

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

beforeEach(() => {
  reset();
  setPlatformOS("web");
});

afterEach(() => {
  setPlatformOS("ios");
});

describe("DocumentTitle (#2294)", () => {
  it("is the H1 through the one template", () => {
    render(<DocumentTitle page="Sign in" />);

    expect(tags().filter(({ type }) => type === "title")).toEqual([
      { type: "title", props: { children: "Sign in - Selftend" } },
    ]);
  });

  // A public route file exists iff it is indexable: nothing carries noindex
  // unless it says so, and only +not-found does.
  it("carries no robots tag unless asked, and noindex when asked", () => {
    render(<DocumentTitle page="Sign in" />);
    expect(meta("robots")).toEqual([]);

    reset();
    render(<DocumentTitle page="Page not found" noindex />);
    expect(meta("robots").map(({ props }) => props.content)).toEqual(["noindex"]);
  });

  it("renders nothing off web", () => {
    setPlatformOS("ios");

    render(<DocumentTitle page="Sign in" />);

    expect(rendered()).toBe(false);
  });
});
