import { render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { useDocumentThemeVars } from "@/src/lib/use-document-theme-vars";

// The portal fix (#582). On web, @rn-primitives mounts popovers, dialogs,
// selects and toasts into document.body — outside the root View that carries
// the theme's vars() — so without this mirror every portalled surface resolves
// its tokens from global.css and paints the FALLBACK palette. The first
// casualty would be the theme menu itself, which is a portalled popover.
//
// jest-expo runs in the node environment, where there is no document at all, so
// the test supplies one. A fake rather than jsdom deliberately: what is under
// test is which properties the hook sets and clears, and a Map-backed style
// declaration asserts that directly without a new dependency in the tree.

function fakeDocument() {
  const properties = new Map<string, string>();
  return {
    properties,
    documentElement: {
      style: {
        setProperty: (name: string, value: string) => properties.set(name, value),
        removeProperty: (name: string) => properties.delete(name),
      },
    },
  };
}

function Probe({ vars }: { vars: Record<string, string> }) {
  useDocumentThemeVars(vars);
  return null;
}

describe("useDocumentThemeVars on web", () => {
  const originalOS = Platform.OS;
  let doc: ReturnType<typeof fakeDocument>;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    doc = fakeDocument();
    (globalThis as { document?: unknown }).document = doc;
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
    delete (globalThis as { document?: unknown }).document;
  });

  it("mirrors every variable onto the document element", () => {
    render(<Probe vars={{ "--background": "260 20% 9%", "--primary": "264 72% 72%" }} />);

    expect(Object.fromEntries(doc.properties)).toEqual({
      "--background": "260 20% 9%",
      "--primary": "264 72% 72%",
    });
  });

  it("re-mirrors when the palette changes", () => {
    const { rerender } = render(<Probe vars={{ "--primary": "264 72% 72%" }} />);

    rerender(<Probe vars={{ "--primary": "196 58% 62%" }} />);

    expect(doc.properties.get("--primary")).toBe("196 58% 62%");
  });

  // Removing rather than restoring is the deliberate half. What these shadow is
  // the `:root` rule in global.css, and a cleared inline property falls back to
  // it — whereas "restore the previous inline value" would pin the fallback pair
  // as an inline style forever after the first change, which is the very bug
  // this hook exists to prevent.
  it("clears the properties on unmount so the stylesheet takes over again", () => {
    const { unmount } = render(<Probe vars={{ "--primary": "264 72% 72%" }} />);

    unmount();

    expect(doc.properties.size).toBe(0);
  });

  // A palette switch must not leave the previous one's variables behind. They
  // are the same key set today, but a future contract change that dropped a name
  // would strand it on <html> forever.
  it("leaves nothing behind from the previous palette", () => {
    const { rerender } = render(<Probe vars={{ "--primary": "1 2% 3%", "--gone": "4 5% 6%" }} />);

    rerender(<Probe vars={{ "--primary": "7 8% 9%" }} />);

    expect(Object.fromEntries(doc.properties)).toEqual({ "--primary": "7 8% 9%" });
  });
});

describe("useDocumentThemeVars off web", () => {
  const originalOS = Platform.OS;
  let doc: ReturnType<typeof fakeDocument>;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
    doc = fakeDocument();
    (globalThis as { document?: unknown }).document = doc;
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
    delete (globalThis as { document?: unknown }).document;
  });

  // Native has no CSS variables; the root View's vars() reaches the whole tree,
  // portals included. Guarded on Platform rather than on `typeof document` alone
  // because react-native-web's test shims can define one.
  it("does nothing", () => {
    render(<Probe vars={{ "--primary": "264 72% 72%" }} />);

    expect(doc.properties.size).toBe(0);
  });
});
