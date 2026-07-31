/**
 * Guards the verified-App-Links wiring (issue #183): the production Android
 * manifest must claim https://selftend.org/auth-callback with autoVerify, and
 * the assetlinks.json the web deploy serves must vouch for the production
 * package with well-formed certificate fingerprints. Either side silently
 * drifting breaks the email-link handoff into the app.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

/**
 * The iOS half of the same handoff (issue #536). Same failure mode as Android:
 * either side drifting sends email-auth links to Safari instead of the app,
 * and nothing surfaces it until someone taps a link on a real device.
 */
describe("apple-app-site-association", () => {
  // Read as text, not imported: the file is deliberately extensionless because
  // Apple rejects `apple-app-site-association.json`, so there is nothing for
  // the module resolver to key off. Parsing it here also guards the thing most
  // likely to break it - a stray comment or trailing comma making it invalid
  // JSON, which iOS would reject silently.
  const raw = readFileSync(
    join(__dirname, "public", ".well-known", "apple-app-site-association"),
    "utf8",
  );

  it("is valid JSON", () => {
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("vouches for the production app id, team prefix included", () => {
    const aasa = JSON.parse(raw) as {
      applinks: { details: { appIDs: string[]; components: Record<string, string>[] }[] };
    };
    const details = aasa.applinks.details;

    expect(details).toHaveLength(1);
    // Team ID prefix is required - a bare bundle id never associates.
    expect(details[0].appIDs).toEqual(["C5GVSW74D2.org.vasilyoshev.selftend"]);
  });

  it("scopes the association to /auth-callback and nothing wider", () => {
    const aasa = JSON.parse(raw) as {
      applinks: { details: { components: Record<string, string>[] }[] };
    };
    const paths = aasa.applinks.details[0].components.map((c) => c["/"]);

    // Widening this would hand every selftend.org link to the app, including
    // the policy pages that email and the store listing point at.
    expect(paths).toEqual(["/auth-callback"]);
  });
});

describe("app.config ios associated domains", () => {
  it("claims both hosts that serve the app (production)", () => {
    const config = (require("./app.config") as { default: { ios?: unknown } }).default;
    const ios = config.ios as { associatedDomains?: string[] };

    // `www` is included because it serves the app directly rather than
    // redirecting to the apex - a link shared as www would otherwise miss.
    expect(ios.associatedDomains).toEqual(["applinks:selftend.org", "applinks:www.selftend.org"]);
  });

  it("keeps the entitlement off the dev variant, which can never associate", () => {
    jest.resetModules();
    const previous = process.env.SELFTEND_APP_VARIANT;
    process.env.SELFTEND_APP_VARIANT = "development";
    try {
      const config = (require("./app.config") as { default: { ios?: unknown } }).default;
      const ios = config.ios as { associatedDomains?: string[] };
      // The dev bundle id is org.vasilyoshev.selftend.dev, which the
      // association file does not list, so the entitlement would buy nothing
      // and still have to be carried by the dev provisioning profile.
      expect(ios.associatedDomains).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.SELFTEND_APP_VARIANT;
      else process.env.SELFTEND_APP_VARIANT = previous;
      jest.resetModules();
    }
  });
});
