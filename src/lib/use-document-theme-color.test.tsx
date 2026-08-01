import { render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { useDocumentThemeColor } from "@/src/lib/use-document-theme-color";

// The first-paint script in public/index.html sets theme-color and the document
// background once, at load. Everything after it — picking another palette,
// switching appearance, the OS flipping scheme under "system" — used to leave
// the BROWSER chrome on the load-time colour until the next reload. These cover
// the half that runs after React exists.
//
// jest-expo runs in the node environment with no document, so the test supplies
// one. A fake rather than jsdom deliberately, matching use-document-theme-vars:
// what is under test is which values get written, and a plain object asserts
// that without adding a dependency.

function fakeDocument(withMeta = true) {
  const meta = { content: "" };
  return {
    meta,
    documentElement: { style: { backgroundColor: "" } },
    querySelector: (selector: string) => {
      if (!withMeta || selector !== 'meta[name="theme-color"]') return null;
      return { setAttribute: (_name: string, value: string) => (meta.content = value) };
    },
  };
}

function Probe({ color }: { color: string }) {
  useDocumentThemeColor(color);
  return null;
}

describe("useDocumentThemeColor on web", () => {
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

  it("paints the browser chrome and the page with the active colour", () => {
    render(<Probe color="#15121c" />);

    expect(doc.meta.content).toBe("#15121c");
    expect(doc.documentElement.style.backgroundColor).toBe("#15121c");
  });

  // The whole point: a palette or appearance switch has to reach the address
  // bar, not just the app surface.
  it("follows a later palette change instead of pinning the load-time colour", () => {
    const view = render(<Probe color="#15121c" />);

    view.rerender(<Probe color="#f7f5ed" />);

    expect(doc.meta.content).toBe("#f7f5ed");
    expect(doc.documentElement.style.backgroundColor).toBe("#f7f5ed");
  });

  it("still sets the background when the shell has no theme-color meta", () => {
    doc = fakeDocument(false);
    (globalThis as { document?: unknown }).document = doc;

    expect(() => render(<Probe color="#101a23" />)).not.toThrow();
    expect(doc.documentElement.style.backgroundColor).toBe("#101a23");
  });
});

describe("useDocumentThemeColor on native", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
    delete (globalThis as { document?: unknown }).document;
  });

  it("touches nothing — there is no browser chrome to match", () => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
    const doc = fakeDocument();
    (globalThis as { document?: unknown }).document = doc;

    render(<Probe color="#15121c" />);

    expect(doc.meta.content).toBe("");
    expect(doc.documentElement.style.backgroundColor).toBe("");
  });
});
