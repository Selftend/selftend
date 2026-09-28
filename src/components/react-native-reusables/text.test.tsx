import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render-with-providers";
import { getTextFontStyle, Text } from "./text";

describe("getTextFontStyle", () => {
  it("maps the h1 and h2 variant classes to Noto Sans 700", () => {
    // The Nunito display face is gone (Surface 3 redesign): the variants carry
    // font-bold, and the class ladder alone decides the family.
    expect(getTextFontStyle(["text-4xl font-bold tracking-tight"])).toEqual({
      fontFamily: "NotoSans_700Bold",
    });
    expect(getTextFontStyle(["text-3xl font-bold tracking-tight"])).toEqual({
      fontFamily: "NotoSans_700Bold",
    });
  });

  it("keeps h3-and-below and body text on Noto Sans", () => {
    expect(getTextFontStyle(["text-2xl font-semibold tracking-tight"])).toEqual({
      fontFamily: "NotoSans_600SemiBold",
    });
    expect(getTextFontStyle(["text-xl font-semibold tracking-tight"])).toEqual({
      fontFamily: "NotoSans_600SemiBold",
    });
    expect(getTextFontStyle([undefined])).toEqual({ fontFamily: "NotoSans_400Regular" });
    expect(getTextFontStyle(["font-extrabold"])).toEqual({ fontFamily: "NotoSans_800ExtraBold" });
    expect(getTextFontStyle(["font-bold"])).toEqual({ fontFamily: "NotoSans_700Bold" });
    expect(getTextFontStyle(["font-medium"])).toEqual({ fontFamily: "NotoSans_500Medium" });
  });

  it("leaves font-mono text without a fontFamily override", () => {
    expect(getTextFontStyle(["font-mono text-sm"])).toBeUndefined();
  });
});

describe("Text", () => {
  it("renders every heading level in Noto Sans, weighted not re-faced", () => {
    renderWithProviders(
      <>
        <Text variant="h1">Heading one</Text>
        <Text variant="h2">Heading two</Text>
        <Text variant="h3">Heading three</Text>
      </>,
    );
    expect(screen.getByText("Heading one")).toHaveStyle({ fontFamily: "NotoSans_700Bold" });
    expect(screen.getByText("Heading two")).toHaveStyle({ fontFamily: "NotoSans_700Bold" });
    expect(screen.getByText("Heading three")).toHaveStyle({ fontFamily: "NotoSans_600SemiBold" });
  });

  it("keeps hero numerals on the weight their classes name", () => {
    renderWithProviders(<Text className="text-[40px] font-extrabold">4.2</Text>);
    expect(screen.getByText("4.2")).toHaveStyle({ fontFamily: "NotoSans_800ExtraBold" });
  });
});
