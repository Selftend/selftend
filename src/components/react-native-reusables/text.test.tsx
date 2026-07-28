import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render-with-providers";
import { getTextFontStyle, Text } from "./text";

describe("getTextFontStyle", () => {
  it("maps the h1 and h2 variants to the Nunito display face", () => {
    expect(getTextFontStyle(["text-4xl font-extrabold tracking-tight"], "h1")).toEqual({
      fontFamily: "Nunito_800ExtraBold",
    });
    expect(getTextFontStyle(["text-3xl font-extrabold tracking-tight"], "h2")).toEqual({
      fontFamily: "Nunito_800ExtraBold",
    });
  });

  it("maps the font-display marker class to the Nunito display face", () => {
    expect(getTextFontStyle(["font-display text-[40px] font-extrabold"])).toEqual({
      fontFamily: "Nunito_800ExtraBold",
    });
  });

  it("keeps h3-and-below and body text on Noto Sans", () => {
    expect(getTextFontStyle(["text-2xl font-semibold tracking-tight"], "h3")).toEqual({
      fontFamily: "NotoSans_600SemiBold",
    });
    expect(getTextFontStyle(["text-xl font-semibold tracking-tight"], "h4")).toEqual({
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
  it("applies the display face to h1 and h2 but not h3", () => {
    renderWithProviders(
      <>
        <Text variant="h1">Heading one</Text>
        <Text variant="h2">Heading two</Text>
        <Text variant="h3">Heading three</Text>
      </>,
    );
    expect(screen.getByText("Heading one")).toHaveStyle({ fontFamily: "Nunito_800ExtraBold" });
    expect(screen.getByText("Heading two")).toHaveStyle({ fontFamily: "Nunito_800ExtraBold" });
    expect(screen.getByText("Heading three")).toHaveStyle({ fontFamily: "NotoSans_600SemiBold" });
  });

  it("applies the display face to font-display hero numerals", () => {
    renderWithProviders(<Text className="font-display text-[40px] font-extrabold">4.2</Text>);
    expect(screen.getByText("4.2")).toHaveStyle({ fontFamily: "Nunito_800ExtraBold" });
  });
});
