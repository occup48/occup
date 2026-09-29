import { Buffer } from "node:buffer";
import { z } from "zod";

// bcrypt silently truncates passwords beyond 72 UTF-8 bytes.
const passwordSchema = z.string().refine(
  (password) => Buffer.byteLength(password, "utf8") <= 72,
  "Password must not exceed 72 UTF-8 bytes",
);

export const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name must not exceed 100 characters"),

  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Last name must not exceed 100 characters"),

  email: z
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase()
    .max(100, "Email must not exceed 100 characters"),

  password: passwordSchema
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

export const signInSchema = z.object({
  email: z.email("Please provide a valid email address").trim().toLowerCase(),

  password: passwordSchema.min(1, "Password is required"),
});

export const googleProfileSchema = z.object({
  firstName: z.string().max(100, "First name must not exceed 100 characters"),
  lastName: z.string().max(100, "Last name must not exceed 100 characters"),
  email: signUpSchema.shape.email,
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, "Google credential is required"),
});


export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
