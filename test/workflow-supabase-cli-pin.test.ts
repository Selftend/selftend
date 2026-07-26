import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOWS_DIR = join(__dirname, "..", ".github", "workflows");

// `version: latest` makes supabase/setup-cli resolve the release through the
// GitHub releases API, which is rate-limited on busy runners - it killed two CI
// jobs on 2026-07-26 (issue #264) before any test ran. A concrete version skips
// that call entirely (the action builds the download URL directly) and keeps CI
// reproducible. No `v` prefix: the action feeds this input straight into
// semver's gte(), which throws on `v`-prefixed input.
const CONCRETE_VERSION = /^\d+\.\d+\.\d+$/;

type Pin = { file: string; line: number; version: string | null };

// Deliberately a text scan rather than a YAML parse: no YAML parser is a
// declared dependency here, and the repo's dependency policy would rather this
// convention test stayed dependency-free (see migration-conventions.test.ts).
const collectPins = (): Pin[] => {
  const pins: Pin[] = [];

  for (const file of readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))) {
    const lines = readFileSync(join(WORKFLOWS_DIR, file), "utf8").split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!/^\s*(-\s*)?uses:\s*supabase\/setup-cli@/.test(line)) return;

      const indent = line.search(/\S/);
      let version: string | null = null;

      // Walk the rest of the step - anything indented deeper than the `uses:`
      // key - looking for the `with.version` input. A line at or above the
      // `uses:` indent means the next step started.
      for (let i = index + 1; i < lines.length; i++) {
        const next = lines[i];
        if (next.trim() === "" || next.trim().startsWith("#")) continue;
        if (next.search(/\S/) < indent) break;

        const match = next.match(/^\s*version:\s*(\S+)\s*$/);
        if (match) {
          version = match[1].replace(/^["']|["']$/g, "");
          break;
        }
      }

      pins.push({ file, line: index + 1, version });
    });
  }

  return pins;
};

describe("supabase/setup-cli version pins", () => {
  it("still finds setup-cli steps to check", () => {
    // Guards the two assertions below from silently passing on an empty list
    // if the workflows are restructured.
    expect(collectPins().length).toBeGreaterThan(0);
  });

  it("pins every setup-cli step to a concrete version, never `latest`", () => {
    const offenders = collectPins()
      .filter((pin) => pin.version === null || !CONCRETE_VERSION.test(pin.version))
      .map((pin) => `${pin.file}:${pin.line} -> ${pin.version ?? "(no version: input)"}`);

    expect(offenders).toEqual([]);
  });

  it("pins every setup-cli step to the same version", () => {
    // One version across CI, staging and release keeps a bump to a single edit
    // and stops the environments drifting apart.
    const versions = [...new Set(collectPins().map((pin) => pin.version))];

    expect(versions).toHaveLength(1);
  });
});
