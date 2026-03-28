import app from "./app";
import { logger } from "./lib/logger";
import { startReminderEngine, stopReminderEngine } from "./services/reminderEngine";
import { runStartupMigration } from "./lib/startupMigration";

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server will continue");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection — server will continue");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

logger.info({
  PORT: rawPort,
  DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
  NODE_ENV: process.env.NODE_ENV || "not set",
}, "Startup environment check");

// Run idempotent startup migration before accepting traffic
runStartupMigration().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    // Start the Smart Reminder Engine (background deadline/overdue scanner)
    startReminderEngine();
  });
}).catch((err) => {
  logger.error({ err }, "Fatal: startup migration failed");
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  stopReminderEngine();
  process.exit(0);
});
process.on("SIGINT", () => {
  stopReminderEngine();
  process.exit(0);
});
