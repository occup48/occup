import { Router } from "express";

import { getUser, signIn, signUp } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/sign-up", requireAuth, signUp);
authRouter.post("/sign-in", signIn);
authRouter.get("/user", requireAuth, getUser);

export default authRouter;
