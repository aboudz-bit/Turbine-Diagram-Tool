import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
