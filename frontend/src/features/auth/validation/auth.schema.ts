import { z } from "zod";
import type { AuthFormValues, AuthMode } from "../types/auth";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const password = z.string().min(1, "Enter your password.").refine(
  (value) => new TextEncoder().encode(value).length <= 72,
  "Your password must be 72 UTF-8 bytes or fewer. Try a shorter password.",
);

export const signInSchema = z.object({
  email,
  password,
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = z.object({
  firstName: z.string().trim().min(2, "Enter at least 2 characters.").max(100, "Use 100 characters or fewer."),
  lastName: z.string().trim().min(2, "Enter at least 2 characters.").max(100, "Use 100 characters or fewer."),
  email: email.refine((value) => value.length <= 100, "Use 100 characters or fewer."),
  password: password
    .min(8, "Use at least 8 characters.")
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/[0-9]/, "Include a number.")
    .regex(/[^A-Za-z0-9]/, "Include a special character."),
  confirmPassword: z.string().min(1, "Confirm your password."),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export function getAuthSchema(mode: AuthMode): z.ZodType<AuthFormValues, AuthFormValues> {
  return mode === "signin" ? signInSchema : signUpSchema;
}
