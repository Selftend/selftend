import fs from "fs";
import path from "path";

/**
 * `.env.example` never ships an opt-out URL as a bare `KEY=` (#2209).
 *
 * A bare `KEY=` in a dotenv file is an EMPTY STRING, not unset — `@expo/env`
 * parses it with `node:util.parseEnv` and copies it into `process.env` with no
 * empty-value filter. For the community and store URLs, empty is the documented
 * opt-out (`src/lib/env.ts` falls back with `??`, which rescues only
 * `undefined`), so the template's own instruction — "leave unset for the
 * default; set to an empty string to hide" — was contradicted one line below
 * by the assignment that follows it. `cp .env.example .env`, the single
 * documented setup step, hid the Donate row and every community link in every
 * local build.
 *
 * ☠️ **The key list is read off `src/lib/env.ts`, never hardcoded here.** A key
 * is an opt-out URL when its reader is `process.env.X ?? "https://…"`; the next
 * such key added to `env.ts` is covered the day it lands, and a key whose
 * default stops being a URL leaves the list by itself. The three contact
 * addresses are excluded by construction: they fall back to `""`, and for them
 * empty is not an opt-out (`.env.example` says so in its own comment).
 */
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8").split(/\r?\n/);
const ENV_TS = fs.readFileSync(path.join(ROOT, "src", "lib", "env.ts"), "utf8");

/** Every `process.env.X ?? "https://…"` reader in env.ts. */
const OPT_OUT_URL_KEYS = [
  ...ENV_TS.matchAll(/process\.env\.(EXPO_PUBLIC_[A-Z_]+)\s*\?\?\s*"https:/g),
].map((m) => m[1]);

describe(".env.example and the opt-out URLs (#2209)", () => {
  it("derives the key list from env.ts, so the assertions below are not vacuous", () => {
    expect(OPT_OUT_URL_KEYS).toContain("EXPO_PUBLIC_SPONSORS_URL");
    expect(OPT_OUT_URL_KEYS).toContain("EXPO_PUBLIC_PLAY_STORE_URL");
    expect(OPT_OUT_URL_KEYS.length).toBeGreaterThanOrEqual(6);
  });

  it.each(OPT_OUT_URL_KEYS)("%s is not an active empty assignment", (key) => {
    // Active `KEY=` with nothing after it: the copied template opts out.
    const bare = TEMPLATE.filter((line) => line.trim() === `${key}=`);
    expect({ key, bare }).toEqual({ key, bare: [] });
  });

  it.each(OPT_OUT_URL_KEYS)("%s is still documented in the template", (key) => {
    // The fix is to comment the line out (or give it a real value, as the
    // GitHub repo URL has), not to delete it — the template is where a
    // self-hoster learns the key exists.
    const documented = TEMPLATE.some(
      (line) =>
        (/^#\s*/.test(line) && line.includes(`${key}=`)) ||
        (line.startsWith(`${key}=`) && line.trim().length > `${key}=`.length),
    );
    expect({ key, documented }).toEqual({ key, documented: true });
  });
});
