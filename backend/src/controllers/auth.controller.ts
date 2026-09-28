import type { Request, Response } from "express";
import z from "zod";

import { signUpUser, signInUser, getUserById, googleAuthUser } from "../services/auth.service.js";
import { signUpSchema, signInSchema, googleAuthSchema } from "../validators/auth.validator.js";

export const signUp = async (req: Request, res: Response) => {
  const result = signUpSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid signup data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const user = await signUpUser(result.data);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Email already in use") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Signup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  const result = signInSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid login details",
      errors: z.treeifyError(result.error),
    });
  }

  try {
    const { user, accessToken } = await signInUser(result.data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  const result = googleAuthSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid Google credential",
      errors: z.treeifyError(result.error),
    });
  }

  try {
    const { user, accessToken } = await googleAuthUser(result.data);

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid Google account") {
        return res.status(401).json({
          success: false,
          message: "Unable to verify Google account",
        });
      }

      if (
        error.message ===
        "An account with this email already exists. Sign in with your password first."
      ) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }
    }

    console.error("Google authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to authenticate with Google",
    });
  }
};

export const getUser = async (_req: Request, res: Response) => {
  try {
    const { userId } = res.locals.user as {
      userId: string;
      role: "customer" | "admin";
    };

    const user = await getUserById(userId);

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user",
    });
  }
};