import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { postReservation } from "../controllers/reservations.controller.js";
import {
  cancelMyReservation,
  getMyReservation,
  getMyReservations,
} from "../controllers/customer-reservations.controller.js";

const reservationsRouter = Router();

reservationsRouter.post("/", requireAuth, postReservation);
reservationsRouter.get("/", requireAuth, getMyReservations);
reservationsRouter.get("/:id", requireAuth, getMyReservation);
reservationsRouter.patch("/:id/cancel", requireAuth, cancelMyReservation);

export default reservationsRouter;