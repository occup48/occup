import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  createTable,
  getTables,
  updateTable,
} from "../controllers/admin-table.controller.js";


const router = Router();

router.get("/test", requireAuth, requireAdmin, (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Admin access granted",
    })
})

router.get("/tables", requireAuth, requireAdmin, getTables);

router.post("/tables", requireAuth, requireAdmin, createTable);

router.patch("/tables/:id", requireAuth, requireAdmin, updateTable);

export default router;