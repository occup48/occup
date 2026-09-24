import { config } from "dotenv";

config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
