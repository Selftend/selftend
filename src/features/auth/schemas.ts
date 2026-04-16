import { z } from "zod";

export const magicLinkSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
});

export type MagicLinkSignInSchema = z.infer<typeof magicLinkSignInSchema>;
