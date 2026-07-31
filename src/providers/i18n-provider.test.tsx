import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { I18nProvider, useLanguage } from "@/src/providers/i18n-provider";
import { detectDeviceLanguage } from "@/src/i18n/detect-language";

jest.mock("@/src/i18n/detect-language", () => ({ detectDeviceLanguage: jest.fn() }));

jest.mock("@/src/i18n", () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn() },
  ensureLanguageBundle: jest.fn().mockResolvedValue(undefined),
  supportedLanguages: ["en", "bg"],
}));

const mockDetect = detectDeviceLanguage as jest.MockedFunction<typeof detectDeviceLanguage>;

const LANGUAGE_STORAGE_KEY = "selftend:language";
const LANGUAGE_DETECTED_KEY = "selftend:language:detected";

function Probe() {
  const { language, hydrated } = useLanguage();
  return <Text>{hydrated ? `lang:${language}` : "pending"}</Text>;
}

async function renderAndSettle() {
  render(
    <I18nProvider>
      <Probe />
    </I18nProvider>,
  );
  await waitFor(() => expect(screen.getByText(/^lang:/)).toBeTruthy());
}

describe("I18nProvider first-run language detection", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockDetect.mockReset();
    mockDetect.mockReturnValue("en");
  });

  it("adopts the device language on a fresh install and persists it", async () => {
    mockDetect.mockReturnValue("bg");

    await renderAndSettle();

    expect(screen.getByText("lang:bg")).toBeTruthy();
    // Persisted, so the choice is stable rather than re-derived every launch.
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("bg");
  });

  it("leaves an existing user in English even with no stored preference", async () => {
    // Any prior app state marks this as an existing install, not a new one.
    await AsyncStorage.setItem("selftend:security:appLockEnabled", "1");
    mockDetect.mockReturnValue("bg");

    await renderAndSettle();

    expect(screen.getByText("lang:en")).toBeTruthy();
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it("treats the hyphenated query cache as prior state too", async () => {
    await AsyncStorage.setItem("selftend-query-cache", "{}");
    mockDetect.mockReturnValue("bg");

    await renderAndSettle();

    expect(screen.getByText("lang:en")).toBeTruthy();
  });

  it("lets an explicit stored preference win over the device language", async () => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mockDetect.mockReturnValue("bg");

    await renderAndSettle();

    // The whole point of (c): choosing English on a Bulgarian phone must stick.
    expect(screen.getByText("lang:en")).toBeTruthy();
    expect(mockDetect).not.toHaveBeenCalled();
  });

  it("applies a stored non-default preference", async () => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, "bg");

    await renderAndSettle();

    expect(screen.getByText("lang:bg")).toBeTruthy();
  });

  it("only ever detects once, even after the preference is cleared", async () => {
    await AsyncStorage.setItem(LANGUAGE_DETECTED_KEY, "1");
    mockDetect.mockReturnValue("bg");

    await renderAndSettle();

    expect(screen.getByText("lang:en")).toBeTruthy();
    expect(mockDetect).not.toHaveBeenCalled();
  });

  it("records the detection marker on a fresh install so it does not re-run", async () => {
    mockDetect.mockReturnValue("bg");

    await renderAndSettle();

    expect(await AsyncStorage.getItem(LANGUAGE_DETECTED_KEY)).toBe("1");
  });

  it("stays in English when the device language is unsupported", async () => {
    mockDetect.mockReturnValue("en");

    await renderAndSettle();

    expect(screen.getByText("lang:en")).toBeTruthy();
    // Nothing to persist when the answer is the default.
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it("still marks hydrated when storage throws", async () => {
    const spy = jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("storage unavailable"));

    await renderAndSettle();

    expect(screen.getByText("lang:en")).toBeTruthy();
    spy.mockRestore();
  });
});
