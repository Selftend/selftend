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
