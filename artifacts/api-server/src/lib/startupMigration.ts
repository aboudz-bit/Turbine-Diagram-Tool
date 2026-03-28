/**
 * Idempotent startup migration.
 * Runs on every server boot (dev + production).
 * Safe to run multiple times — only applies changes where data is missing.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

const DEMO_PASSWORD = "Demo@2024";

const DEMO_USERS: Array<{ email: string; username: string }> = [
  { email: "ahmed.alrashidi@sgt.com", username: "ahmed.alrashidi" },
  { email: "sarah.mitchell@sgt.com",  username: "sarah.mitchell"  },
  { email: "khalid.hamdan@sgt.com",   username: "khalid.hamdan"   },
  { email: "omar.farouq@sgt.com",     username: "omar.farouq"     },
  { email: "priya.nair@sgt.com",      username: "priya.nair"      },
];

export async function runStartupMigration(): Promise<void> {
  try {
    logger.info("Running startup migration...");

    // 1. Add columns if they don't already exist (safe DDL)
    await db.execute(sql`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS username TEXT,
        ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    // 2. Add unique constraint on username if it doesn't exist
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'users_username_unique'
            AND table_name = 'users'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
        END IF;
      END $$;
    `);

    // 3. Seed demo credentials for any user missing them
    const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

    let updated = 0;
    for (const u of DEMO_USERS) {
      const result = await db.execute(sql`
        UPDATE users
        SET
          username      = ${u.username},
          password_hash = ${hash}
        WHERE email = ${u.email}
          AND (username IS NULL OR password_hash IS NULL);
      `);
      // rowCount is available on the raw pg result
      const rowCount = (result as unknown as { rowCount: number }).rowCount ?? 0;
      if (rowCount > 0) {
        logger.info({ email: u.email, username: u.username }, "Demo credentials set");
        updated++;
      }
    }

    if (updated > 0) {
      logger.info({ updated }, "PRODUCTION LOGIN FIXED — demo credentials seeded");
    } else {
      logger.info("Startup migration: all demo credentials already in place");
    }
  } catch (err) {
    // Log but don't crash the server — a migration error shouldn't block startup
    logger.error({ err }, "Startup migration error");
  }
}
