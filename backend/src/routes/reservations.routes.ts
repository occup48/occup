import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { postReservation } from "../controllers/reservations.controller.js";

const reservationsRouter = Router();

reservationsRouter.post("/", requireAuth, postReservation);

export default reservationsRouter;