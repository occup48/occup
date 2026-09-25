import { config } from "dotenv";
import express from "express";

import authRoutes from "./routes/auth.routes.js";

config({ path: ".env.local" });

const app = express();

const port = Number(process.env.PORT) || 8000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello from Express!");
});

app.use("/api/auth", authRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
