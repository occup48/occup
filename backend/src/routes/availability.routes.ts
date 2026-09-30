import { Router } from "express";

import { getAvailability } from "../controllers/availability.controller.js";

const availabilityRouter = Router();

availabilityRouter.get("/", getAvailability);

export default availabilityRouter;