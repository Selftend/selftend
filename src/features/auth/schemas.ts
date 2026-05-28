import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .min(1, { message: "Enter your email address." })
  .email({ message: "Enter a valid email address." });

const passwordField = z.string().min(12, { message: "Password must be at least 12 characters." });

const newPasswordField = z
  .string()
  .min(12, { message: "Password must be at least 12 characters." });

export const signInSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type SignInSchema = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(100, { message: "Name must be 100 characters or fewer." })
      .optional(),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string().min(1, { message: "Confirm your password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
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
    confirmPassword: z.string().min(1, { message: "Confirm your new password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
