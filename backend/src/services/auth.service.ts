import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { or } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import type { SignUpInput, SignInInput, GoogleAuthInput } from "../validators/auth.validator.js";
import { generateAccessToken } from "../utils/jwt.js";


const googleClient = new OAuth2Client();

// Precomputed at cost 12, matching signup. Compare against it when no account exists
// so unknown emails still perform the same expensive password check.
const DUMMY_PASSWORD_HASH =
  "$2b$12$xEA.3feT9UDsRJfaQoue2OkLR9k0oWgUNxfljFiHeP4mwihfio3hm";

export const signUpUser = async (input: SignUpInput) => {
  const { firstName, lastName, email, password } = input;

  // 1. Check whether the email is already registered
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("Email already in use");
  }

  // 2. Hash the password before storing it
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Create the user
  const [newUser] = await db
    .insert(users)
    .values({
      firstName,
      lastName,
      email,
      passwordHash,
    })
    // The unique email constraint also handles concurrent signup requests.
    .onConflictDoNothing({ target: users.email })
    .returning({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  if (!newUser) {
    throw new Error("Email already in use");
  }

  return newUser;
};

export const signInUser = async (input: SignInInput) => {
  const { email, password } = input;

  // 1. Find the user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // 2. Always compare a hash before rejecting invalid credentials.
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  // 4. Return safe user information
  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    accessToken,
  };
};

export const googleAuthUser = async (input: GoogleAuthInput) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("Google authentication is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: input.credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();

  if (
    !payload ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new Error("Invalid Google account");
  }

  const googleSub = payload.sub;
  const email = payload.email.toLowerCase();

  const [existingUser] = await db
    .select()
    .from(users)
    .where(or(eq(users.googleSub, googleSub), eq(users.email, email)))
    .limit(1);

  if (existingUser) {
    if (existingUser.googleSub === googleSub) {
      const accessToken = generateAccessToken({
        userId: existingUser.id,
        role: existingUser.role,
      });

      return {
        user: {
          id: existingUser.id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          role: existingUser.role,
          createdAt: existingUser.createdAt,
        },
        accessToken,
      };
    }

    throw new Error(
      "An account with this email already exists. Sign in with your password first.",
    );
  }

  const firstName =
    payload.given_name?.trim() || payload.name?.split(" ")[0] || "Google";

  const lastName =
    payload.family_name?.trim() ||
    payload.name?.split(" ").slice(1).join(" ") ||
    "User";

  const [newUser] = await db
    .insert(users)
    .values({
      firstName,
      lastName,
      email,
      googleSub,
    })
    .returning();

  if (!newUser) {
    throw new Error("Failed to create Google user");
  }

  const accessToken = generateAccessToken({
    userId: newUser.id,
    role: newUser.role,
  });

  return {
    user: {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    },
    accessToken,
  };
};

export const getUserById = async (userId: string) => {
  const [user] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

