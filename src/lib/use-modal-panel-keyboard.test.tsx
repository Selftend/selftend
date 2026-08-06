import { render } from "@testing-library/react-native";
import { Platform } from "react-native";
import { useEffect, type MutableRefObject } from "react";

import { useModalPanelKeyboard } from "@/src/lib/use-modal-panel-keyboard";

// jest-expo runs in the node environment with no document; the test supplies a
// fake (use-document-theme-vars.test.tsx pattern). What is under test is the
// trap's logic — which element gets focus, which keydowns are swallowed — and
// hand-rolled fakes assert that directly without pulling jsdom into the tree.

interface FakeElement {
  name: string;
  focus: jest.Mock;
}

interface FakeKeyEvent {
  key: string;
  shiftKey: boolean;
  preventDefault: jest.Mock;
}

type KeydownHandler = (event: FakeKeyEvent) => void;

function makeElement(doc: FakeDocument, name: string): FakeElement {
  const el: FakeElement = {
    name,
    focus: jest.fn(() => {
      doc.activeElement = el;
    }),
  };
  return el;
}

interface FakeDocument {
  activeElement: FakeElement | null;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  handlers: Set<KeydownHandler>;
}

function fakeDocument(): FakeDocument {
  const doc: FakeDocument = {
    activeElement: null,
    handlers: new Set<KeydownHandler>(),
    addEventListener: jest.fn((_type: string, handler: KeydownHandler) => {
      doc.handlers.add(handler);
    }),
    removeEventListener: jest.fn((_type: string, handler: KeydownHandler) => {
      doc.handlers.delete(handler);
    }),
  };
  return doc;
}

function makePanel(items: FakeElement[]) {
  return {
    querySelectorAll: () => items,
    contains: (node: unknown) => items.includes(node as FakeElement),
  };
}

let captured: MutableRefObject<unknown> | null = null;

function Probe({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { panelRef } = useModalPanelKeyboard({ open, onClose });
  // Captured from an effect (not render — the compiler's immutability rule):
  // the test needs the ref object to attach the fake panel before opening.
  useEffect(() => {
    captured = panelRef as MutableRefObject<unknown>;
  }, [panelRef]);
  return null;
}

function press(doc: FakeDocument, key: string, shiftKey = false): FakeKeyEvent {
  const event: FakeKeyEvent = { key, shiftKey, preventDefault: jest.fn() };
  for (const handler of doc.handlers) {
    handler(event);
  }
  return event;
}

describe("useModalPanelKeyboard", () => {
  const originalOS = Platform.OS;
  let doc: FakeDocument;
  let hamburger: FakeElement;
  let home: FakeElement;
  let middle: FakeElement;
  let last: FakeElement;
  let onClose: jest.Mock;

  // Renders closed first so the fake panel can be attached to the returned
  // ref before the open render arms the trap (the effect reads the ref).
  function renderOpenPanel() {
    const view = render(<Probe open={false} onClose={onClose} />);
    captured!.current = makePanel([home, middle, last]);
    view.rerender(<Probe open onClose={onClose} />);
    return view;
  }

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    doc = fakeDocument();
    (globalThis as { document?: unknown }).document = doc;
    hamburger = makeElement(doc, "hamburger");
    home = makeElement(doc, "home");
    middle = makeElement(doc, "middle");
    last = makeElement(doc, "last");
    doc.activeElement = hamburger;
    onClose = jest.fn();
    captured = null;
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
    delete (globalThis as { document?: unknown }).document;
  });

  it("focuses the panel's first focusable item on open", () => {
    renderOpenPanel();

    expect(home.focus).toHaveBeenCalled();
    expect(doc.activeElement).toBe(home);
  });

  it("closes on Escape", () => {
    renderOpenPanel();

    const event = press(doc, "Escape");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("wraps Tab from the last item to the first", () => {
    renderOpenPanel();
    last.focus();

    const event = press(doc, "Tab");

    expect(event.preventDefault).toHaveBeenCalled();
    expect(doc.activeElement).toBe(home);
  });

  it("wraps Shift+Tab from the first item to the last", () => {
    renderOpenPanel();

    const event = press(doc, "Tab", true);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(doc.activeElement).toBe(last);
  });

  it("lets the browser handle Tab between interior items", () => {
    renderOpenPanel();
    middle.focus();

    const event = press(doc, "Tab");

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("pulls focus back into the panel when it escaped", () => {
    renderOpenPanel();
    doc.activeElement = hamburger; // outside the panel

    const event = press(doc, "Tab");

    expect(event.preventDefault).toHaveBeenCalled();
    expect(doc.activeElement).toBe(home);
  });

  it("returns focus to the opener on close and removes the listener", () => {
    const view = renderOpenPanel();
    expect(doc.activeElement).toBe(home);

    view.rerender(<Probe open={false} onClose={onClose} />);

    expect(hamburger.focus).toHaveBeenCalled();
    expect(doc.activeElement).toBe(hamburger);
    expect(doc.handlers.size).toBe(0);
  });

  it("returns focus to the opener on unmount", () => {
    const view = renderOpenPanel();

    view.unmount();

    expect(doc.activeElement).toBe(hamburger);
    expect(doc.handlers.size).toBe(0);
  });

  it("is a no-op on native", () => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });

    renderOpenPanel();

    expect(doc.addEventListener).not.toHaveBeenCalled();
    expect(home.focus).not.toHaveBeenCalled();
  });
});
