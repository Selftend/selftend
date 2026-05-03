import { signInSchema, signUpSchema, forgotPasswordSchema, resetPasswordSchema } from "@/src/features/auth/schemas";

describe("signInSchema", () => {
  it("accepts valid email and password", () => {
    const result = signInSchema.safeParse({
      email: "  person@example.com  ",
      password: "securePass1",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "person@example.com",
      password: "securePass1",
    });
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "securePass1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = signInSchema.safeParse({
      email: "a@b.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts matching passwords", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "longEnough1",
      confirmPassword: "longEnough1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "longEnough1",
      confirmPassword: "different1",
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
  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "newPass123",
      confirmPassword: "mismatch1",
    });

    expect(result.success).toBe(false);
  });
});
