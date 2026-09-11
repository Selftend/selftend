import { appEnv } from "@/src/lib/env";
import {
  STORE_LINK_SOURCES,
  STORE_LINK_SOURCE_MAX_LENGTH,
  taggedAppStoreUrl,
  taggedPlayStoreUrl,
} from "@/src/lib/store-links";

const PLAY = "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend";
const APPLE = "https://apps.apple.com/app/selftend/id6796318929";

describe("the source vocabulary", () => {
  const sources = Object.values(STORE_LINK_SOURCES);

  // One string has to serve Play's utm_source and Apple's ct, and Apple's cap is
  // the tighter of the two. A name over the cap is truncated by Apple rather
  // than rejected, so it would be a silently wrong row in the console.
  it.each(sources)("%s is within Apple's campaign-token cap", (source) => {
    expect(source.length).toBeLessThanOrEqual(STORE_LINK_SOURCE_MAX_LENGTH);
  });

  it.each(sources)("%s is lowercase-hyphenated", (source) => {
    expect(source).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
  });

  it("has no duplicates - two surfaces sharing a name merge into one row", () => {
    expect(new Set(sources).size).toBe(sources.length);
  });

  // ⚠️ The rule is "name the surface, not the platform": `r-selftend`, never
  // `reddit`, and never `android`. A platform name would merge distinct surfaces
  // into one row, which is exactly the thing the scheme exists to undo.
  it.each(sources)("%s names a surface, not a platform", (source) => {
    expect(source).not.toMatch(/\b(android|ios|apple|google|play)\b/);
  });
});

describe("the Play link", () => {
  // ☠️☠️ The trap this module exists for. Play's UTM parameters ride
  // URL-ENCODED INSIDE `referrer=`, not as top-level query params. A
  // hand-written `?utm_source=...` registers nothing, silently, and looks
  // correct in review - so this asserts the nesting, not merely the presence.
  it("nests utm_source inside referrer= rather than at the top level", () => {
    const url = taggedPlayStoreUrl(STORE_LINK_SOURCES.downloadBar);

    expect(url).toContain(`referrer=${encodeURIComponent("utm_source=web-download-bar")}`);
    // The shape that would silently record nothing.
    expect(url).not.toMatch(/[?&]utm_source=/);
    expect(url).not.toMatch(/[?&]utm_campaign=/);
  });

  it("keeps the listing's own id parameter and appends with &", () => {
    const url = taggedPlayStoreUrl(STORE_LINK_SOURCES.downloadBar);

    expect(url.startsWith(`${PLAY}&referrer=`)).toBe(true);
  });

  it("nests the campaign beside the source, still inside referrer=", () => {
    const url = taggedPlayStoreUrl(STORE_LINK_SOURCES.getTheApp, "web-get-the-app-2026-10");

    expect(url).toContain(
      `referrer=${encodeURIComponent("utm_source=web-get-the-app&utm_campaign=web-get-the-app-2026-10")}`,
    );
  });

  // ⚠️ Play has no medium dimension, so its absence is a decision, not an
  // oversight. Pinned so nobody "fixes" it.
  it("omits utm_medium", () => {
    expect(taggedPlayStoreUrl(STORE_LINK_SOURCES.downloadBar)).not.toContain("utm_medium");
  });
});

describe("the App Store link", () => {
  it("tags with ct, the token Apple actually reads", () => {
    expect(taggedAppStoreUrl(STORE_LINK_SOURCES.getTheApp)).toBe(`${APPLE}?ct=web-get-the-app`);
  });

  // ⚠️ Apple has ONE token where Play has two, so a campaign displaces the
  // source rather than sitting beside it. This only stays readable because
  // campaign names are self-identifying, which couples the naming rule to this
  // format.
  it("uses the campaign in place of the source when one exists", () => {
    expect(taggedAppStoreUrl(STORE_LINK_SOURCES.getTheApp, "web-get-the-app-2026-10")).toBe(
      `${APPLE}?ct=web-get-the-app-2026-10`,
    );
  });

  it("omits utm_medium", () => {
    expect(taggedAppStoreUrl(STORE_LINK_SOURCES.getTheApp)).not.toContain("utm_medium");
  });
});

// A fork that opted out has no store at all. Handing it `?ct=...` hanging off an
// empty string would turn "absent" into a broken link, and every call site gates
// its surface on the truthiness of what these return.
describe("an unconfigured store", () => {
  let play: string;
  let apple: string;

  beforeEach(() => {
    play = appEnv.playStoreUrl;
    apple = appEnv.appStoreUrl;
    appEnv.playStoreUrl = "";
    appEnv.appStoreUrl = "";
  });

  afterEach(() => {
    appEnv.playStoreUrl = play;
    appEnv.appStoreUrl = apple;
  });

  it("stays empty rather than becoming a bare query string", () => {
    expect(taggedPlayStoreUrl(STORE_LINK_SOURCES.downloadBar)).toBe("");
    expect(taggedAppStoreUrl(STORE_LINK_SOURCES.getTheApp)).toBe("");
  });
});

// ☠️☠️ The half that matters most, and the one a later edit is most likely to
// undo. `appEnv.playStoreUrl` / `appStoreUrl` feed four consumers, and
// `use-update-availability` opens the store FROM INSIDE THE INSTALLED APP. A tag
// on the bare constants would inject every updating user into the very dimension
// this scheme exists to read.
//
// ⚠️ Note what is asserted and what is not. #2324 asked for "no query
// parameters", which is not meetable: the Play listing URL necessarily carries
// `?id=<package>`, and stripping it would not be a link. What must be absent is
// any TAGGING parameter, which is the thing that would actually corrupt the
// number.
describe("the bare constants stay bare", () => {
  const TAGGING_PARAMS = ["referrer", "utm_source", "utm_campaign", "utm_medium", "ct", "pt", "mt"];

  it.each(TAGGING_PARAMS)("playStoreUrl carries no %s", (param) => {
    expect(appEnv.playStoreUrl).not.toMatch(new RegExp(`[?&]${param}=`));
  });

  it.each(TAGGING_PARAMS)("appStoreUrl carries no %s", (param) => {
    expect(appEnv.appStoreUrl).not.toMatch(new RegExp(`[?&]${param}=`));
  });

  // The Play URL's own `id` is the package, not a tag: asserted positively so
  // that "carries no tagging parameter" can never be satisfied by the URL
  // having been emptied or mangled.
  it("playStoreUrl still carries the package id it needs", () => {
    expect(appEnv.playStoreUrl).toMatch(/[?&]id=/);
  });

  // ☠️ The same guarantee as an ALLOWLIST of query keys rather than a denylist
  // of tagging ones. `TAGGING_PARAMS` above can only catch a name somebody
  // thought to forbid; naming the keys that may appear catches a tag under any
  // name at all. Both are kept: the denylist names the specific danger and
  // reads as documentation, this one closes the open end.
  const ALLOWED_QUERY_KEYS: Record<string, string[]> = {
    playStoreUrl: ["id"],
    appStoreUrl: [],
  };

  function queryKeys(url: string): string[] {
    const query = url.split("#")[0].split("?").slice(1).join("?");
    return query
      ? query
          .split("&")
          .filter(Boolean)
          .map((pair) => pair.split("=")[0])
      : [];
  }

  it.each(Object.keys(ALLOWED_QUERY_KEYS))("%s carries no query key but its own", (name) => {
    const url = appEnv[name as "playStoreUrl" | "appStoreUrl"];

    expect({ name, keys: queryKeys(url) }).toEqual({ name, keys: ALLOWED_QUERY_KEYS[name] });
  });

  // Prove that check is looking at something, on both stores.
  it("would catch a tagged constant under any parameter name", () => {
    expect(queryKeys(`${PLAY}&referrer=utm_source%3Dweb-download-bar`)).not.toEqual(
      ALLOWED_QUERY_KEYS.playStoreUrl,
    );
    expect(queryKeys(`${PLAY}&something_nobody_forbade=x`)).not.toEqual(
      ALLOWED_QUERY_KEYS.playStoreUrl,
    );
    expect(queryKeys(`${APPLE}?ct=app-support`)).not.toEqual(ALLOWED_QUERY_KEYS.appStoreUrl);
  });

  // ⚠️ What neither guard can see, stated rather than left to be discovered:
  // both read `appEnv`, which resolves `EXPO_PUBLIC_PLAY_STORE_URL` /
  // `EXPO_PUBLIC_APP_STORE_URL` first. A tag added to a deployment's env var
  // would reach the update path and trip nothing here - only a human reading
  // the deploy config would know.
  it("cannot see a tag added through the deployment's env var", () => {
    const previous = process.env.EXPO_PUBLIC_PLAY_STORE_URL;
    process.env.EXPO_PUBLIC_PLAY_STORE_URL = `${PLAY}&referrer=utm_source%3Dsomething`;
    jest.resetModules();

    try {
      const { appEnv: freshEnv } = require("@/src/lib/env") as typeof import("@/src/lib/env");

      // The tag is live in the config and every guard above still passes.
      expect(queryKeys(freshEnv.playStoreUrl)).toContain("referrer");
      expect(queryKeys(appEnv.playStoreUrl)).toEqual(ALLOWED_QUERY_KEYS.playStoreUrl);
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_PLAY_STORE_URL;
      else process.env.EXPO_PUBLIC_PLAY_STORE_URL = previous;
      jest.resetModules();
    }
  });
});
