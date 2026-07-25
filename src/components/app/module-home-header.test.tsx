import { fireEvent, screen } from "@testing-library/react-native";

import { ModuleHomeHeader } from "./module-home-header";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("react-native", () => {
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual("react-native");
  function MockModal({ children, visible }: { children?: React.ReactNode; visible?: boolean }) {
    return visible === false ? null : React.createElement(actual.View, null, children);
  }
  MockModal.displayName = "MockModal";

  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "Modal") {
        return MockModal;
      }

      return Reflect.get(target, prop, receiver);
    },
  });
});

jest.mock("expo-router", () => {
  const React = require("react") as typeof import("react");

  return {
    router: {
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      push: jest.fn(),
    },
    usePathname: () => "/modules/cbt",
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

function renderHeader({ includeProgram = false }: { includeProgram?: boolean } = {}) {
  const onPressTune = jest.fn();
  const onPressInfo = jest.fn();
  const onPressProgram = jest.fn();

  renderWithProviders(
    <ModuleHomeHeader
      title="CBT"
      tourScope="cbt"
      actions={[
        { type: "tune", onPress: onPressTune },
        { type: "notifications", targetKey: "cbt" },
        ...(includeProgram ? [{ type: "program" as const, onPress: onPressProgram }] : []),
        { type: "info", onPress: onPressInfo },
      ]}
    />,
  );

  return { onPressTune, onPressInfo, onPressProgram };
}

describe("ModuleHomeHeader action buttons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders every provided action button", () => {
    renderHeader({ includeProgram: true });

    expect(screen.getByLabelText("Customise")).toBeTruthy();
    expect(screen.getByLabelText("Notifications")).toBeTruthy();
    expect(screen.getByLabelText("CBT program")).toBeTruthy();
    expect(screen.getByLabelText("About this module")).toBeTruthy();
  });

  it("fires onPress for a plain action button (tune)", () => {
    const { onPressTune } = renderHeader();

    fireEvent.press(screen.getByLabelText("Customise"));

    expect(onPressTune).toHaveBeenCalledTimes(1);
  });

  it("fires onPress for the info action button", () => {
    const { onPressInfo } = renderHeader();

    fireEvent.press(screen.getByLabelText("About this module"));

    expect(onPressInfo).toHaveBeenCalledTimes(1);
  });

  it("fires onPress for the program action button", () => {
    const { onPressProgram } = renderHeader({ includeProgram: true });

    fireEvent.press(screen.getByLabelText("CBT program"));

    expect(onPressProgram).toHaveBeenCalledTimes(1);
  });

  it("renders no first-run coach-mark overlay for any action", () => {
    renderHeader({ includeProgram: true });

    expect(screen.queryByText("Got it")).toBeNull();
    expect(screen.queryByText("Skip all tips")).toBeNull();
  });

  it("renders no tour even when actions were never dismissed", () => {
    // No shownButtonTours mechanism remains - the module header never shows tips,
    // regardless of any "dismissed" state (there's no dismissal to track).
    renderHeader();

    expect(screen.queryByText(/Tap here/i)).toBeNull();
  });
});

describe("ModuleHomeHeader hero mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the title and tagline when hue and icon are provided", async () => {
    renderWithProviders(
      <ModuleHomeHeader
        title="Check-in"
        tourScope="mood"
        hue="be"
        icon="mood"
        description="Log how you're feeling."
        actions={[{ type: "info", onPress: jest.fn() }]}
      />,
    );

    // Hero renders title in both the chip label and the h1 heading; use heading role for uniqueness.
    expect(await screen.findByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(await screen.findByText("Log how you're feeling.")).toBeTruthy();
  });

  it("renders module chip with tint, icon, and module label", () => {
    renderWithProviders(
      <ModuleHomeHeader
        hue="think"
        icon="psychology"
        tourScope="cbt"
        title="Cognitive Behavioral Therapy"
        moduleLabel="CBT"
        description="..."
      />,
    );
    expect(screen.getAllByText("CBT").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Cognitive Behavioral Therapy" })).toBeTruthy();
  });

  it("falls back to title for chip label when moduleLabel not provided", () => {
    renderWithProviders(
      <ModuleHomeHeader hue="act" icon="explore" tourScope="act" title="ACT" description="..." />,
    );
    // chip + heading both contain "ACT"
    expect(screen.getAllByText("ACT").length).toBeGreaterThanOrEqual(2);
  });

  it("omits the chip when moduleLabel is explicitly null", () => {
    renderWithProviders(
      <ModuleHomeHeader
        hue="think"
        icon="psychology"
        tourScope="cbt"
        title="Cognitive Behavioral Therapy"
        moduleLabel={null}
        description="A focused CBT section..."
      />,
    );
    expect(screen.getByRole("heading", { name: "Cognitive Behavioral Therapy" })).toBeTruthy();
    // No chip rendered = no second occurrence of the title text
    expect(screen.getAllByText("Cognitive Behavioral Therapy")).toHaveLength(1);
  });

  it("renders without a tourScope prop (now unused, kept only for call-site compatibility)", () => {
    renderWithProviders(
      <ModuleHomeHeader
        hue="think"
        icon="psychology"
        title="Cognitive Behavioral Therapy"
        description="..."
      />,
    );
    expect(screen.getByRole("heading", { name: "Cognitive Behavioral Therapy" })).toBeTruthy();
  });
});

describe("ModuleHomeHeader field variant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderFieldHeader({ moduleLabel = null }: { moduleLabel?: string | null } = {}) {
    const onPressInfo = jest.fn();
    renderWithProviders(
      <ModuleHomeHeader
        variant="field"
        title="Check-in"
        hue="be"
        icon="mood"
        moduleLabel={moduleLabel}
        description="Log how you're feeling."
        actions={[
          { type: "notifications", targetKey: "mood" },
          { type: "info", onPress: onPressInfo },
        ]}
      />,
    );
    return { onPressInfo };
  }

  it("renders the hue field gradient behind the title, description, and actions", () => {
    renderFieldHeader();

    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(screen.getByText("Log how you're feeling.")).toBeTruthy();
    expect(screen.getByLabelText("Notifications")).toBeTruthy();
    expect(screen.getByLabelText("About this module")).toBeTruthy();
  });

  it("keeps action buttons working on the field", () => {
    const { onPressInfo } = renderFieldHeader();

    fireEvent.press(screen.getByLabelText("About this module"));

    expect(onPressInfo).toHaveBeenCalledTimes(1);
  });

  it("omits the chip when moduleLabel is null (single title occurrence)", () => {
    renderFieldHeader({ moduleLabel: null });

    expect(screen.getAllByText("Check-in")).toHaveLength(1);
  });

  it("renders an on-field chip when moduleLabel is provided", () => {
    renderFieldHeader({ moduleLabel: "Mood" });

    expect(screen.getByText("Mood")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
  });

  it("falls back to hero mode when no hue is provided", () => {
    renderWithProviders(<ModuleHomeHeader variant="field" title="Check-in" description="..." />);

    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
  });
});
