import { resetPasswordSchema, signInSchema, signUpSchema } from "@/src/features/auth/schemas";

describe("auth schemas", () => {
  it("accepts a valid sign-in payload", () => {
    expect(() =>
      signInSchema.parse({
        email: "hello@example.com",
        password: "password123",
      }),
    ).not.toThrow();
  });

  it("rejects mismatched signup passwords", () => {
    expect(() =>
      signUpSchema.parse({
        email: "hello@example.com",
        password: "password123",
        confirmPassword: "password456",
      }),
    ).toThrow("Passwords do not match.");
  });

  it("rejects an invalid reset email", () => {
    expect(() => resetPasswordSchema.parse({ email: "not-an-email" })).toThrow(
      "Enter a valid email address.",
    );
  });
});
