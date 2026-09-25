import { Router } from "express";

import { getUser, signIn, signUp } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { signInRateLimiter } from "../middleware/auth-rate-limit.middleware.js";

const authRouter = Router();

authRouter.post("/sign-up", signUp);
authRouter.post("/sign-in", signInRateLimiter, signIn);
authRouter.get("/user", requireAuth, getUser);

export default authRouter;
