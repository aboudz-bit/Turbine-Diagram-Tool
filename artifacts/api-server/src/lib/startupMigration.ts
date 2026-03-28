/**
 * Idempotent startup migration — runs on every server boot (dev + production).
 * Responsibilities:
 *  1. Add username / password_hash columns if missing (DDL)
 *  2. Seed the database if it is completely empty
 *  3. Ensure all demo users have username + bcrypt password hash set
 */
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { eq, or, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";
import { seedDatabase } from "@workspace/db/seedData";

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

    // ── Step 1: Add columns if they don't already exist (safe DDL) ──────────
    await db.execute(sql`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS username TEXT,
        ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

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

    // ── Step 2: Seed the database if it is empty ────────────────────────────
    const existingUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .limit(1);

    if (existingUsers.length === 0) {
      logger.info("Database is empty — running initial seed...");
      const result = await seedDatabase();
      if (result.seeded) {
        logger.info("Initial seed complete");
      } else {
        logger.info({ reason: result.reason }, "Seed skipped");
      }
    }

    // ── Step 3: Ensure demo credentials are set on all demo users ───────────
    // Re-check after potential seed
    const usersWithoutCreds = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(or(isNull(usersTable.username), isNull(usersTable.passwordHash)));

    if (usersWithoutCreds.length === 0) {
      logger.info("Startup migration: all demo credentials already in place");
      return;
    }

    logger.info({ count: usersWithoutCreds.length }, "Setting demo credentials for users missing them...");

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
      const rowCount = (result as unknown as { rowCount: number }).rowCount ?? 0;
      if (rowCount > 0) {
        logger.info({ email: u.email, username: u.username }, "Demo credentials set");
        updated++;
      }
    }

    if (updated > 0) {
      logger.info({ updated }, "PRODUCTION LOGIN FIXED — demo credentials seeded");
    } else {
      logger.info("Startup migration: credentials were already set for all users");
    }
  } catch (err) {
    logger.error({ err }, "Startup migration error");
    throw err; // Re-throw so server startup fails loudly rather than silently
  }
}
