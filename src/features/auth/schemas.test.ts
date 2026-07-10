import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/src/features/auth/schemas";

describe("signInSchema", () => {
  it("accepts a 12-char password", () => {
    const result = signInSchema.safeParse({
      email: "  person@example.com  ",
      password: "twelvechars1",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "person@example.com",
      password: "twelvechars1",
    });
  });

  it("rejects an 11-char password", () => {
    const result = signInSchema.safeParse({
      email: "a@b.com",
      password: "elevenchars",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "twelvechars1",
    });

    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts a 12-char password with matching confirmation", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "twelvechars1",
      confirmPassword: "twelvechars1",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a long letters-only password (no character-class rules)", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "abcdefghijklmnop",
      confirmPassword: "abcdefghijklmnop",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a long digits-only password (no character-class rules)", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "123456789012",
      confirmPassword: "123456789012",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an 11-char password", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "elevenchars",
      confirmPassword: "elevenchars",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "twelvechars1",
      confirmPassword: "different1234",
    });

    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "a@b.com" });
    expect(result.success).toBe(true);
  });
});

describe("validation messages are i18n keys", () => {
  // The forms resolve these via t() in the "auth" namespace at render time.
  // Asserting the KEYS here pins the contract; the i18n key-coverage test
  // guarantees each key exists in en and bg.
  it("signInSchema emits keys for empty email and short password", () => {
    const result = signInSchema.safeParse({ email: "", password: "short" });

    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("validation.emailRequired");
    expect(messages).toContain("validation.passwordMin12");
  });

  it("signUpSchema emits keys for invalid email, long name, and mismatched passwords", () => {
    const result = signUpSchema.safeParse({
      name: "x".repeat(101),
      email: "not-an-email",
      password: "twelvechars1",
      confirmPassword: "different123",
    });

    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("validation.emailInvalid");
    expect(messages).toContain("validation.nameMax100");
    expect(messages).toContain("validation.passwordsDoNotMatch");
  });

  it("signUpSchema emits the key for a missing confirmation", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "twelvechars1",
      confirmPassword: "",
    });

    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("validation.confirmPasswordRequired");
  });

  it("resetPasswordSchema emits the key for a missing confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      password: "twelvechars1",
      confirmPassword: "",
    });

    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("validation.confirmNewPasswordRequired");
  });

  it("emits no raw English sentences (keys only)", () => {
    const result = signUpSchema.safeParse({
      name: "x".repeat(101),
      email: "",
      password: "short",
      confirmPassword: "",
    });

    expect(result.success).toBe(false);
    for (const issue of result.error!.issues) {
      expect(issue.message).toMatch(/^validation\.[a-zA-Z0-9]+$/);
    }
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a 12-char password with matching confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      password: "newSafePass1!",
      confirmPassword: "newSafePass1!",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an 11-char new password", () => {
    const result = resetPasswordSchema.safeParse({
      password: "elevenchars",
      confirmPassword: "elevenchars",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "twelvechars1",
      confirmPassword: "mismatched12",
    });

    expect(result.success).toBe(false);
  });
});
