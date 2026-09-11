import { appEnv } from "@/src/lib/env";
import {
  STORE_LINK_SOURCES,
  storeLinkSourceValues,
  taggedAppStoreUrl,
  taggedPlayStoreUrl,
} from "@/src/lib/store-links";

const PLAY_BASE = "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend";
const APPLE_BASE = "https://apps.apple.com/app/selftend/id6796318929";

describe("tagged store links", () => {
  let playStoreUrl: string;
  let appStoreUrl: string;

  beforeEach(() => {
    playStoreUrl = appEnv.playStoreUrl;
    appStoreUrl = appEnv.appStoreUrl;
    appEnv.playStoreUrl = PLAY_BASE;
    appEnv.appStoreUrl = APPLE_BASE;
  });

  afterEach(() => {
    appEnv.playStoreUrl = playStoreUrl;
    appEnv.appStoreUrl = appStoreUrl;
  });

  // The trap this module exists for: Play reads its UTM parameters out of a
  // single URL-encoded `referrer=` value. A top-level `?utm_source=` registers
  // nothing, silently, and looks right in review.
  it("nests the Play source inside referrer= rather than at the top level", () => {
    const url = taggedPlayStoreUrl(STORE_LINK_SOURCES.webDownloadBar);

    expect(url).toBe(`${PLAY_BASE}&referrer=utm_source%3Dweb-download-bar`);
    expect(url).toContain("referrer=utm_source%3D");
    expect(url).not.toContain("&utm_source=");
    expect(url).not.toContain("?utm_source=");
  });

  it("appends the Play referrer with ? when the base URL carries no query", () => {
    appEnv.playStoreUrl = "https://example.test/app";

    expect(taggedPlayStoreUrl(STORE_LINK_SOURCES.webDownloadBar)).toBe(
      "https://example.test/app?referrer=utm_source%3Dweb-download-bar",
    );
  });

  // Apple's parameters are top-level, and `ct` is the only free-text slot.
  it("puts the Apple source in a top-level ct parameter", () => {
    const url = taggedAppStoreUrl(STORE_LINK_SOURCES.appSupport);

    expect(url).toBe(`${APPLE_BASE}?ct=app-support`);
    expect(url).not.toContain("referrer=");
  });

  // Play has no medium dimension and Apple has no slot for one. Omitted on
  // purpose (measurement.md section 5) - a test so nobody "fixes" it later.
  it("carries no utm_medium on either store", () => {
    for (const source of storeLinkSourceValues()) {
      expect(taggedPlayStoreUrl(source)).not.toContain("utm_medium");
      expect(taggedAppStoreUrl(source)).not.toContain("utm_medium");
    }
  });

  // An unconfigured store stays absent rather than becoming a bare tag: the
  // surfaces gate their visibility on the URL being truthy.
  it("returns an empty string when the store is not configured", () => {
    appEnv.playStoreUrl = "";
    appEnv.appStoreUrl = "   ";

    expect(taggedPlayStoreUrl(STORE_LINK_SOURCES.webDownloadBar)).toBe("");
    expect(taggedAppStoreUrl(STORE_LINK_SOURCES.webAuthLanding)).toBe("");
  });

  it("keeps every source value inside the vocabulary rules", () => {
    for (const source of storeLinkSourceValues()) {
      expect({ source, ok: source.length <= 30 }).toEqual({ source, ok: true });
      expect(source).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
    }
  });

  it("has no duplicate source values", () => {
    const values = storeLinkSourceValues();

    expect(new Set(values).size).toBe(values.length);
  });
});

// `use-update-availability` opens the store from inside the installed app. If
// the bare constants were ever tagged, every updating user would land in the
// very dimension this scheme exists to read. The tagged constant is separate,
// and this test is what keeps the bare ones bare.
describe("the bare store constants", () => {
  // Read the shipped defaults back out of the module rather than restating
  // them here: a literal sitting beside the assertion would pin nothing.
  function shippedDefaults(): { playStoreUrl: string; appStoreUrl: string } {
    const previousPlay = process.env.EXPO_PUBLIC_PLAY_STORE_URL;
    const previousApple = process.env.EXPO_PUBLIC_APP_STORE_URL;
    delete process.env.EXPO_PUBLIC_PLAY_STORE_URL;
    delete process.env.EXPO_PUBLIC_APP_STORE_URL;
    jest.resetModules();

    try {
      const { appEnv: freshEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");
      return { playStoreUrl: freshEnv.playStoreUrl, appStoreUrl: freshEnv.appStoreUrl };
    } finally {
      if (previousPlay === undefined) delete process.env.EXPO_PUBLIC_PLAY_STORE_URL;
      else process.env.EXPO_PUBLIC_PLAY_STORE_URL = previousPlay;
      if (previousApple === undefined) delete process.env.EXPO_PUBLIC_APP_STORE_URL;
      else process.env.EXPO_PUBLIC_APP_STORE_URL = previousApple;
      jest.resetModules();
    }
  }

  // The Play default legitimately carries `?id=`, so this cannot assert "no
  // query parameters at all" - it names the tagging parameters instead.
  const TAGGING_PARAMETERS = ["referrer=", "utm_", "ct=", "pt=", "mt="];

  it("leaves the shipped Play and App Store URLs free of tagging parameters", () => {
    const defaults = shippedDefaults();

    for (const [name, url] of Object.entries(defaults)) {
      expect({ name, url, tagged: TAGGING_PARAMETERS.filter((p) => url.includes(p)) }).toEqual({
        name,
        url,
        tagged: [],
      });
    }
  });

  // Prove the check above is looking at something: a tagged URL trips it.
  it("would catch a tagged constant", () => {
    const previous = appEnv.playStoreUrl;
    appEnv.playStoreUrl = PLAY_BASE;

    try {
      const tagged = taggedPlayStoreUrl(STORE_LINK_SOURCES.webDownloadBar);

      expect(TAGGING_PARAMETERS.filter((parameter) => tagged.includes(parameter))).not.toEqual([]);
    } finally {
      appEnv.playStoreUrl = previous;
    }
  });
});
