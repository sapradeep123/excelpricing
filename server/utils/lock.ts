import { db } from "../db";
import { sql } from "drizzle-orm";
import { logInfo, logWarn, logError } from "../logger";

/**
 * PostgreSQL advisory lock for distributed sync operations
 * This ensures only one process can sync at a time, even with multiple server instances
 */
export class DistributedLock {
  private lockId: number;
  private lockName: string;

  constructor(lockName: string) {
    this.lockName = lockName;
    // Convert lock name to a consistent integer hash
    this.lockId = this.hashString(lockName);
  }

  /**
   * Simple string hash function to convert lock name to integer
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Acquire lock (non-blocking)
   * Returns true if lock was acquired, false if already locked
   */
  async tryAcquire(): Promise<boolean> {
    try {
      const result = await db.execute(
        sql`SELECT pg_try_advisory_lock(${this.lockId}) as acquired`
      );
      const acquired = (result.rows[0] as any)?.acquired ?? false;

      if (acquired) {
        logInfo(`Distributed lock acquired: ${this.lockName}`, {
          lockId: this.lockId,
        });
      } else {
        logWarn(`Distributed lock already held: ${this.lockName}`, {
          lockId: this.lockId,
        });
      }

      return acquired;
    } catch (error) {
      logError("Error acquiring distributed lock", error, {
        lockName: this.lockName,
        lockId: this.lockId,
      });
      return false;
    }
  }

  /**
   * Acquire lock (blocking, with timeout)
   * Waits up to timeoutMs for the lock to become available
   */
  async acquire(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const acquired = await this.tryAcquire();
      if (acquired) return true;

      // Wait 1 second before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logWarn(`Timeout waiting for distributed lock: ${this.lockName}`, {
      lockId: this.lockId,
      timeoutMs,
    });
    return false;
  }

  /**
   * Release lock
   */
  async release(): Promise<void> {
    try {
      await db.execute(
        sql`SELECT pg_advisory_unlock(${this.lockId}) as released`
      );
      logInfo(`Distributed lock released: ${this.lockName}`, {
        lockId: this.lockId,
      });
    } catch (error) {
      logError("Error releasing distributed lock", error, {
        lockName: this.lockName,
        lockId: this.lockId,
      });
    }
  }

  /**
   * Execute a function with lock protection
   */
  async withLock<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T | null> {
    const acquired = await this.acquire(timeoutMs);
    if (!acquired) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.release();
    }
  }
}

// Pre-defined locks for common operations
export const syncLock = new DistributedLock("pricing_sync");
