import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// #87 — the field-encryption boundary depends on a config invariant: app.decrypt_text
// is SECURITY DEFINER (reads the Vault key) and granted to `authenticated`, so the ONLY
// thing stopping an authenticated user from calling it directly as a decryption oracle
// is that the `app` schema is not exposed by PostgREST. PostgREST exposes the schemas in
// [api].schemas (default: public, graphql_public). If `app` ever lands in that list, the
// oracle becomes reachable at /rest/v1/rpc/decrypt_text. This test fails the build if so.
//
// It also guards db.extra_search_path defensively — `app` there alone does not expose the
// schema over the API, but it's a smell worth catching in review.

const CONFIG_PATH = resolve(__dirname, "../supabase/config.toml");

function sectionBody(toml: string, header: string): string | null {
  // Capture the lines of a [header] table up to the next top-level [section] or EOF.
  const lines = toml.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `[${header}]`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^\s*\[[^\]]+\]\s*$/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

function exposedSchemas(apiBody: string | null): string[] {
  if (!apiBody) return [];
  // schemas = ["public", "graphql_public"] — may span lines; grab from `schemas` to `]`.
  const match = apiBody.match(/schemas\s*=\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1].trim());
}

describe("supabase/config.toml schema exposure (#87)", () => {
  const toml = readFileSync(CONFIG_PATH, "utf8");

  it("never exposes the `app` schema through PostgREST [api].schemas", () => {
    const schemas = exposedSchemas(sectionBody(toml, "api"));
    // Empty list = no override = PostgREST default (public + graphql_public), which is safe.
    expect(schemas).not.toContain("app");
  });

  it("does not place `app` on the API db search path", () => {
    const apiBody = sectionBody(toml, "api") ?? "";
    const searchPathMatch = apiBody.match(/extra_search_path\s*=\s*\[([\s\S]*?)\]/);
    const searchPath = searchPathMatch
      ? [...searchPathMatch[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1].trim())
      : [];
    expect(searchPath).not.toContain("app");
  });
});
