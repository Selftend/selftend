// test/cbt-dispute-prompts.test.ts
//
// The dispute prompts are consumed via a dynamic key (record.${key}) in
// app/(app)/modules/cbt/new.tsx, which the literal-key guard cannot see.
// Assert the keys exist with real content in both locales.
import en from "@/src/i18n/locales/en/cbt.json";
import bg from "@/src/i18n/locales/bg/cbt.json";

const PROMPT_KEYS = [
  "disputePrompt1",
  "disputePrompt2",
  "disputePrompt3",
  "disputePrompt4",
  "disputePrompt5",
] as const;

describe.each([
  ["en", en],
  ["bg", bg],
])("%s cbt.json dispute prompts", (_locale, resources) => {
  const record = (resources as { record: Record<string, string> }).record;

  it.each(PROMPT_KEYS)("defines record.%s with real content", (key) => {
    expect(typeof record[key]).toBe("string");
    expect(record[key].length).toBeGreaterThan(10);
    expect(record[key]).not.toContain("disputePrompt");
  });
});
