import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { logger, logInfo, logError } from "./logger";

const { Pool } = pg;

/**
 * Run database migrations
 * Usage: npm run db:migrate
 */
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logError("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
  });

  const db = drizzle(pool);

  try {
    logInfo("Starting database migrations...");

    await migrate(db, {
      migrationsFolder: "./drizzle",
    });

    logInfo("Migrations completed successfully");
    await pool.end();
    process.exit(0);
  } catch (error) {
    logError("Migration failed", error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
