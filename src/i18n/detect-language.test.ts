import { getLocales } from "expo-localization";

import { detectDeviceLanguage } from "@/src/i18n/detect-language";

jest.mock("expo-localization", () => ({ getLocales: jest.fn() }));

const mockLocales = getLocales as jest.MockedFunction<typeof getLocales>;

// Only the two fields the detector reads; the real payload is much wider.
const locale = (languageCode: string | null, languageTag: string) =>
  ({ languageCode, languageTag }) as unknown as ReturnType<typeof getLocales>[number];

describe("detectDeviceLanguage", () => {
  beforeEach(() => mockLocales.mockReset());

  it("matches on the language subtag, ignoring the region", () => {
    mockLocales.mockReturnValue([locale("bg", "bg-BG")]);
    expect(detectDeviceLanguage()).toBe("bg");
  });

  it("resolves en for an English regional variant", () => {
    mockLocales.mockReturnValue([locale("en", "en-GB")]);
    expect(detectDeviceLanguage()).toBe("en");
  });

  it("walks past unsupported languages to a supported one further down the ranking", () => {
    mockLocales.mockReturnValue([locale("de", "de-DE"), locale("bg", "bg-BG")]);
    expect(detectDeviceLanguage()).toBe("bg");
  });

  it("falls back to en when nothing on the device is supported", () => {
    mockLocales.mockReturnValue([locale("de", "de-DE"), locale("fr", "fr-FR")]);
    expect(detectDeviceLanguage()).toBe("en");
  });

  it("derives the subtag from languageTag when languageCode is null", () => {
    mockLocales.mockReturnValue([locale(null, "bg-BG")]);
    expect(detectDeviceLanguage()).toBe("bg");
  });

  it("is case-insensitive", () => {
    mockLocales.mockReturnValue([locale("BG", "BG-bg")]);
    expect(detectDeviceLanguage()).toBe("bg");
  });

  it("falls back to en on an empty list", () => {
    // expo-localization types this as a non-empty tuple, but the native module is not
    // bound by that, so the runtime guard is still worth covering.
    mockLocales.mockReturnValue([] as unknown as ReturnType<typeof getLocales>);
    expect(detectDeviceLanguage()).toBe("en");
  });

  it("never throws out of startup when getLocales fails", () => {
    mockLocales.mockImplementation(() => {
      throw new Error("no locale provider");
    });
    expect(detectDeviceLanguage()).toBe("en");
  });
});
