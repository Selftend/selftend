import {
  JOURNAL_BODY_MAX,
  JOURNAL_TITLE_MAX,
  journalEntrySchema,
} from "@/src/features/journal/schemas";

describe("journalEntrySchema", () => {
  it("accepts a minimal valid entry with no title", () => {
    const result = journalEntrySchema.safeParse({
      title: "",
      body: "Something on my mind today.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty body", () => {
    const result = journalEntrySchema.safeParse({ title: "", body: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a body that is only whitespace", () => {
    const result = journalEntrySchema.safeParse({
      title: "",
      body: "   \n\t ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong title", () => {
    const result = journalEntrySchema.safeParse({
      title: "x".repeat(JOURNAL_TITLE_MAX + 1),
      body: "ok",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong body", () => {
    const result = journalEntrySchema.safeParse({
      title: "",
      body: "x".repeat(JOURNAL_BODY_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fully populated entry", () => {
    const result = journalEntrySchema.safeParse({
      title: "Quiet morning",
      body: "Slept well, took a walk.",
    });
    expect(result.success).toBe(true);
  });
});
