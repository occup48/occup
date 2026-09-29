import { config } from "dotenv";
import cors from "cors";
import express from "express";

import authRoutes from "./routes/auth.routes.js";

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

app.get("/", (_req, res) => {
  res.send("Hello from Express!");
});

app.use("/api/auth", authRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
