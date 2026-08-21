import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A `patch-package` patch is applied by FILENAME: `name+version.patch` runs
 * only against that exact installed version. Bump the dependency and the patch
 * stops applying — `postinstall` prints a warning into a wall of install output
 * and exits 0, so every guarantee the patch carried reverts with nothing
 * failing.
 *
 * That is not theoretical here. `react-native-ui-datepicker+3.3.0.patch` is the
 * only thing giving the calendar grid accessible day names, selected state and
 * translated month navigation (#1301) — the library hardcodes all of it inside
 * its own `Pressable`, where no public prop reaches. A silent drop takes the
 * calendar back to days announced as "8, button" and selection conveyed by
 * colour alone, and not one test would notice, because they all assert rendered
 * output that the unpatched library would still produce a shape for.
 *
 * So: whoever bumps one of these dependencies re-cuts its patch
 * (`npx patch-package <name>`) and commits the renamed file. This fails until
 * they do.
 */

const ROOT = join(__dirname, "..");
const PATCHES = join(ROOT, "patches");

/** `react-native-sortables+1.9.4.patch` -> `{ name, version }`. */
function parsePatchName(file: string): { name: string; version: string } {
  const stem = file.replace(/\.patch$/, "");
  const cut = stem.lastIndexOf("+");
  if (cut === -1) throw new Error(`Unparseable patch filename: ${file}`);
  return {
    // patch-package encodes a scoped package's slash as `+`.
    name: stem.slice(0, cut).replace(/^(@[^+]+)\+/, "$1/"),
    version: stem.slice(cut + 1),
  };
}

const patchFiles = readdirSync(PATCHES).filter((file) => file.endsWith(".patch"));

describe("patch-package patches still match their installed dependency", () => {
  it("finds the patches (canary: the calendar accessibility patch is one of them)", () => {
    // If this directory listing rots, the version check below iterates nothing
    // and passes vacuously.
    expect(patchFiles).toContain("react-native-ui-datepicker+3.3.0.patch");
    expect(patchFiles.length).toBeGreaterThanOrEqual(2);
  });

  it.each(patchFiles)("%s applies to the installed version", (file) => {
    const { name, version } = parsePatchName(file);
    const manifest = join(ROOT, "node_modules", ...name.split("/"), "package.json");
    const installed = JSON.parse(readFileSync(manifest, "utf8")).version as string;

    // If this fails, the dependency moved and the patch no longer applies:
    // re-cut it with `npx patch-package ${name}`, delete the stale file, and
    // commit the new one. Do NOT just rename it — the source it patched moved.
    expect(`${name}@${installed}`).toBe(`${name}@${version}`);
  });
});
