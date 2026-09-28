import { Router } from "express";

import { getUser, signIn, signUp, googleAuth } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { signInRateLimiter } from "../middleware/auth-rate-limit.middleware.js";

const authRouter = Router();

authRouter.post("/sign-up", signUp);
authRouter.post("/sign-in", signInRateLimiter, signIn);
authRouter.post("/google", signInRateLimiter, googleAuth);
authRouter.get("/user", requireAuth, getUser);

export default authRouter;
