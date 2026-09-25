import { rateLimit } from "express-rate-limit";

// Counts every signin attempt, independently of whether the email is registered.
// The default memory store is per process; use a shared store for multiple instances.
export const signInRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many signin attempts. Please try again later.",
  },
});
