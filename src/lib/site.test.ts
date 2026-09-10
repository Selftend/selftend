import { SITE_ORIGIN, canonicalUrl } from "@/src/lib/site";

describe("canonicalUrl (#2293)", () => {
  it("is the production apex, whatever the app-links URL says", () => {
    expect(SITE_ORIGIN).toBe("https://selftend.org");
    expect(canonicalUrl("/")).toMatch(/^https:\/\/selftend\.org\//);
  });

  // The root is the one path that carries a slash: an origin's root path is
  // always "/", and the structured-data ruling already wrote it so.
  it("keeps the root's slash", () => {
    expect(canonicalUrl("/")).toBe("https://selftend.org/");
    expect(canonicalUrl("")).toBe("https://selftend.org/");
  });

  // Every other path carries none, so the canonical, the sitemap and the
  // served URL agree byte for byte.
  it.each(["/faq", "faq", "/faq/", "/faq//"])("%s is the slashless path", (path) => {
    expect(canonicalUrl(path)).toBe("https://selftend.org/faq");
  });

  it("keeps a nested path intact", () => {
    expect(canonicalUrl("/modules/cbt/")).toBe("https://selftend.org/modules/cbt");
  });
});
