/**
 * Guards the verified-App-Links wiring (issue #183): the production Android
 * manifest must claim https://selftend.org/auth-callback with autoVerify, and
 * the assetlinks.json the web deploy serves must vouch for the production
 * package with well-formed certificate fingerprints. Either side silently
 * drifting breaks the email-link handoff into the app.
 */
import assetlinks from "./public/.well-known/assetlinks.json";

// expo/config-plugins is a Node-only package that fails to load under
// jest-expo. The production config path only imports it (the cleartext-traffic
// plugin runs solely for dev-variant builds), so a pass-through stub is safe.
jest.mock("expo/config-plugins", () => ({
  withAndroidManifest: (config: unknown) => config,
}));

// SHA-256 fingerprint as Play/keytool print it: 32 colon-separated hex bytes.
const FINGERPRINT_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

describe("assetlinks.json", () => {
  it("vouches for the production package with handle_all_urls", () => {
    expect(assetlinks).toHaveLength(1);
    const statement = assetlinks[0];
    expect(statement.relation).toContain("delegate_permission/common.handle_all_urls");
    expect(statement.target.namespace).toBe("android_app");
    expect(statement.target.package_name).toBe("org.vasilyoshev.selftend");
  });

  it("contains only well-formed SHA-256 certificate fingerprints", () => {
    const fingerprints = assetlinks[0].target.sha256_cert_fingerprints;
    expect(fingerprints.length).toBeGreaterThanOrEqual(1);
    for (const fingerprint of fingerprints) {
      expect(fingerprint).toMatch(FINGERPRINT_RE);
    }
  });
});

describe("app.config android intent filters", () => {
  it("claims the auth-callback path on the web origin with autoVerify (production)", () => {
    // Imported lazily so the default (production) variant is evaluated
    // regardless of what other tests do with the environment.
    const config = (require("./app.config") as { default: { android?: unknown } }).default;
    const android = config.android as {
      intentFilters?: {
        autoVerify?: boolean;
        action?: string;
        data?: { scheme?: string; host?: string; pathPrefix?: string }[];
        category?: string[];
      }[];
    };

    const filters = android.intentFilters ?? [];
    const authFilter = filters.find((f) => f.data?.some((d) => d.pathPrefix === "/auth-callback"));

    expect(authFilter).toBeDefined();
    expect(authFilter?.autoVerify).toBe(true);
    expect(authFilter?.action).toBe("VIEW");
    expect(authFilter?.category).toEqual(expect.arrayContaining(["BROWSABLE", "DEFAULT"]));
    expect(authFilter?.data).toEqual([
      { scheme: "https", host: "selftend.org", pathPrefix: "/auth-callback" },
    ]);
  });
});
