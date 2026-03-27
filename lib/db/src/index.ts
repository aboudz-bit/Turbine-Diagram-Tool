import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "[db] WARNING: DATABASE_URL is not set — database queries will fail. " +
    "Set this in Replit Secrets or your environment.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/turbine_qc",
  // Recover from PostgreSQL restarts: retry idle connections
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  max: 10,
});

// Log pool errors instead of crashing the process
pool.on("error", (err) => {
  console.error("[db] Pool background error (connection will be retried):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
