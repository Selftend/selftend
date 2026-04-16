import { magicLinkSignInSchema } from "@/src/features/auth/schemas";

describe("magicLinkSignInSchema", () => {
  it("accepts a valid email and trims surrounding whitespace", () => {
    const result = magicLinkSignInSchema.safeParse({
      email: "  person@example.com  ",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "person@example.com",
    });
  });

  it("rejects invalid email addresses", () => {
    const result = magicLinkSignInSchema.safeParse({
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toEqual(["Enter a valid email address."]);
  });
});
