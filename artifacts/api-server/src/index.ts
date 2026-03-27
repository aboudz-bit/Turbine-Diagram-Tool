import app from "./app";
import { logger } from "./lib/logger";
import { startReminderEngine, stopReminderEngine } from "./services/reminderEngine";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start the Smart Reminder Engine (background deadline/overdue scanner)
  startReminderEngine();
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
