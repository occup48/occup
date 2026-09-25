import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import type { SignupInput, LoginInput } from "../validators/auth.validator.js";
import { generateAccessToken } from "../utils/jwt.js";

export const signUpUser = async (input: SignupInput) => {
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
    .returning({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  if (!newUser) {
    throw new Error("Failed to create user");
  }

  return newUser;
};

export const signInUser = async (input: LoginInput) => {
  const { email, password } = input;

  // 1. Find the user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // 2. Don't reveal whether the email exists
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // 3. Compare submitted password with stored bcrypt hash
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
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