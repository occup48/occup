import { z } from "zod";
import type { AuthSession, AuthUser, SignUpResult } from "../types/auth";

const userSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: z.enum(["customer", "admin"]),
});
const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({ user: userSchema, accessToken: z.string().min(1).optional() }),
});

type AuthAction = "login" | "signup" | "google" | "user";
const paths: Record<AuthAction, string> = {
  login: import.meta.env.VITE_AUTH_LOGIN_PATH || "/api/auth/login",
  signup: import.meta.env.VITE_AUTH_SIGNUP_PATH || "/api/auth/signup",
  google: "/api/auth/google",
  user: "/api/auth/user",
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function errorMessage(action: AuthAction, status: number): string {
  if (status === 429) return "Too many attempts. Please wait a little before trying again.";
  if (status === 401) return action === "google"
    ? "We couldn’t verify your Google account. Please try again."
    : "The email or password is incorrect. Please try again.";
  if (status === 409) return action === "google"
    ? "An account with this email already exists. Sign in with your password."
    : "An account with this email already exists. Try signing in.";
  if (status === 400) return "Please check your details and try again.";
  return "We couldn’t complete your request. Please try again in a moment.";
}

async function request(action: AuthAction, body?: object, token?: string, signal?: AbortSignal): Promise<SignUpResult> {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new AuthError("Sign-in is temporarily unavailable. Please try again later.");

  let response: Response;
  try {
    response = await fetch(`${base}${paths[action]}`, {
      method: action === "user" ? "GET" : "POST",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AuthError("We couldn’t reach Occup. Check your connection and try again.");
  }
  if (!response.ok) throw new AuthError(errorMessage(action, response.status), response.status);

  // Only the documented, safe response fields enter application state.
  const result = responseSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new AuthError("We couldn’t complete your request. Please try again.");
  return result.data.data;
}

function requireSession(result: SignUpResult): AuthSession {
  if (!result.accessToken) throw new AuthError("We couldn’t sign you in. Please try again.");
  return { user: result.user, accessToken: result.accessToken };
}

export const authService = {
  async signIn(values: { email: string; password: string }, signal?: AbortSignal): Promise<AuthSession> {
    return requireSession(await request("login", { email: values.email, password: values.password }, undefined, signal));
  },
  signUp(values: { firstName: string; lastName: string; email: string; password: string }, signal?: AbortSignal) {
    const { firstName, lastName, email, password } = values;
    return request("signup", { firstName, lastName, email, password }, undefined, signal);
  },
  async google(credential: string, signal?: AbortSignal): Promise<AuthSession> {
    return requireSession(await request("google", { credential }, undefined, signal));
  },
  async getUser(token: string, signal?: AbortSignal): Promise<AuthUser> {
    return (await request("user", undefined, token, signal)).user;
  },
};

export function getAuthError(error: unknown): string {
  return error instanceof AuthError ? error.message : "Something went wrong. Please try again.";
}
