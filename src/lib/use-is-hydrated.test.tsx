import { renderHook } from "@testing-library/react-native";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { useIsHydrated } from "@/src/lib/use-is-hydrated";

/**
 * The two faces of the hook (#2293). A hydration's first client render uses
 * the server snapshot too - React guarantees that - but no test harness here
 * hydrates, so that face is pinned through the server render it has to match.
 */
describe("useIsHydrated", () => {
  // The face the static export renders every public page with.
  it("is false in a server render", () => {
    function Probe() {
      return createElement("span", null, String(useIsHydrated()));
    }

    expect(renderToString(createElement(Probe))).toBe("<span>false</span>");
  });

  // Native, a client-side navigation, a createRoot mount: nothing to match.
  it("is true in a plain client render", () => {
    const { result } = renderHook(() => useIsHydrated());

    expect(result.current).toBe(true);
  });
});
