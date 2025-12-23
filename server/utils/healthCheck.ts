import { db } from "../db";
import { sql } from "drizzle-orm";
import type { Request, Response } from "express";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      responseTime?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

/**
 * Perform health check on database connectivity
 */
async function checkDatabase(): Promise<{
  status: "up" | "down";
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const responseTime = Date.now() - startTime;
    return { status: "up", responseTime };
  } catch (error) {
    return {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get memory usage information
 */
function getMemoryInfo() {
  const usage = process.memoryUsage();
  const total = usage.heapTotal;
  const used = usage.heapUsed;
  const percentage = (used / total) * 100;

  return {
    used: Math.round(used / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round(percentage),
  };
}

/**
 * Comprehensive health check handler
 */
export async function healthCheckHandler(
  req: Request,
  res: Response
): Promise<void> {
  const dbCheck = await checkDatabase();
  const memory = getMemoryInfo();

  const result: HealthCheckResult = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    checks: {
      database: dbCheck,
      memory,
    },
  };

  // Determine overall health status
  if (dbCheck.status === "down") {
    result.status = "unhealthy";
  } else if (memory.percentage > 90) {
    result.status = "degraded";
  }

  const statusCode = result.status === "unhealthy" ? 503 : 200;
  res.status(statusCode).json(result);
}

/**
 * Simple liveness check (just returns 200 OK)
 */
export function livenessCheckHandler(req: Request, res: Response): void {
  res.status(200).json({ status: "alive" });
}

/**
 * Readiness check (verifies critical dependencies)
 */
export async function readinessCheckHandler(
  req: Request,
  res: Response
): Promise<void> {
  const dbCheck = await checkDatabase();

  if (dbCheck.status === "up") {
    res.status(200).json({ status: "ready", database: dbCheck });
  } else {
    res.status(503).json({ status: "not ready", database: dbCheck });
  }
}
