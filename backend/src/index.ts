import { config } from "dotenv";
import cors from "cors";
import express from "express";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js"

config({ path: ".env.local" });

const app = express();

const port = Number(process.env.PORT) || 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use("/api/admin", adminRoutes)

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Occup API is running",
  });
});

app.use("/api/auth", authRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
