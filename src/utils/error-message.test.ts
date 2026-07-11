import { getErrorMessage } from "@/src/utils/error-message";

describe("getErrorMessage", () => {
  it("reads Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("reads a message-bearing object", () => {
    expect(getErrorMessage({ message: "nope" })).toBe("nope");
  });

  it("returns an empty string by default when there is no message", () => {
    expect(getErrorMessage(42)).toBe("");
    expect(getErrorMessage(null)).toBe("");
    expect(getErrorMessage(undefined)).toBe("");
    expect(getErrorMessage({ code: "X" })).toBe("");
    expect(getErrorMessage({ message: 123 })).toBe("");
  });

  it("returns the supplied fallback when there is no message", () => {
    expect(getErrorMessage(42, "fallback")).toBe("fallback");
    expect(getErrorMessage({}, "fallback")).toBe("fallback");
  });

  it("prefers the real message over the fallback", () => {
    expect(getErrorMessage(new Error("real"), "fallback")).toBe("real");
    expect(getErrorMessage({ message: "real" }, "fallback")).toBe("real");
  });

  it("prefers an empty Error message over the fallback (message wins)", () => {
    expect(getErrorMessage(new Error(""), "fallback")).toBe("");
  });
});
