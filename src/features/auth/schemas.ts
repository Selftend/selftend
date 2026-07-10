import { z } from "zod";

// Messages are i18n KEYS (resolved in the "auth" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
const emailField = z
  .string()
  .trim()
  .min(1, "validation.emailRequired")
  .email("validation.emailInvalid");

const passwordField = z.string().min(12, "validation.passwordMin12");

const newPasswordField = z.string().min(12, "validation.passwordMin12");

export const signInSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type SignInSchema = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().trim().max(100, "validation.nameMax100").optional(),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string().min(1, "validation.confirmPasswordRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

export type SignUpSchema = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string().min(1, "validation.confirmNewPasswordRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
