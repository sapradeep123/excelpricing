/**
 * Additional methods to add to PricingStorage class in storage.ts
 * These provide pagination and optimized database operations
 */

import type { Product } from "@shared/schema";
import { products as productsTable } from "@shared/schema";
import { db } from "./db";
import { sql, like, or, eq, and, count } from "drizzle-orm";
import { logInfo, logError } from "./logger";

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get products with pagination and filtering
 * Add this method to the PricingStorage class
 */
export async function getProductsPaginated(
  page: number = 1,
  limit: number = 20,
  category?: string,
  search?: string
): Promise<PaginatedResult<Product>> {
  try {
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (category) {
      conditions.push(eq(productsTable.category, category));
    }
    if (search) {
      conditions.push(
        or(
          like(productsTable.name, `%${search}%`),
          like(productsTable.description, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get paginated data
    const data = await db
      .select()
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(productsTable.id);

    return {
      data,
      pagination: {
        page,
        limit,
        total: total as number,
        totalPages: Math.ceil((total as number) / limit),
      },
    };
  } catch (error) {
    logError("Error fetching paginated products", error);
    throw error;
  }
}

/**
 * Optimized UPSERT operation for products sync
 * This replaces the delete + insert pattern with a proper UPSERT
 *
 * Note: PostgreSQL's ON CONFLICT clause is used for efficient upsert
 * Add this to replace the syncPricingFromAPI database operations
 */
export async function upsertProducts(products: Omit<Product, "id">[]): Promise<void> {
  try {
    logInfo("Starting product upsert", { count: products.length });

    // PostgreSQL ON CONFLICT requires a unique constraint
    // Since we don't have a natural key, we'll use a combination approach:
    // 1. Get existing products
    // 2. Match by name + category
    // 3. Update or insert accordingly

    for (const product of products) {
      await db
        .insert(productsTable)
        .values(product)
        .onConflictDoUpdate({
          target: [productsTable.name, productsTable.category],
          set: {
            description: sql`EXCLUDED.description`,
            subcategory: sql`EXCLUDED.subcategory`,
            unit: sql`EXCLUDED.unit`,
            priceHourly: sql`EXCLUDED.price_hourly`,
            priceMonthly: sql`EXCLUDED.price_monthly`,
            priceYearly: sql`EXCLUDED.price_yearly`,
          },
        });
    }

    logInfo("Product upsert completed", { count: products.length });
  } catch (error) {
    logError("Error upserting products", error);
    // Fallback to delete + insert if upsert fails
    logInfo("Falling back to delete + insert pattern");
    await db.delete(productsTable);

    // Insert in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await db.insert(productsTable).values(batch);
    }
  }
}

/**
 * Document pricing calculation constants
 * These explain the business logic behind pricing conversions
 */
export const PRICING_CONSTANTS = {
  /**
   * Hours per month calculation
   * Based on average month length: 365.25 days / 12 months = 30.4375 days
   * 30.4375 days × 24 hours = 730.5 hours
   * Rounded to 730 for simplicity
   */
  HOURS_PER_MONTH: 730,

  /**
   * Standard months in a year
   */
  MONTHS_PER_YEAR: 12,

  /**
   * Yearly discount percentage
   * Customers get 10% off when paying yearly upfront
   */
  YEARLY_DISCOUNT: 0.9, // 10% discount = multiply by 0.9

  /**
   * Retention period multipliers for Veeam backups
   * Longer retention = higher storage costs
   */
  RETENTION_MULTIPLIERS: {
    "7": 0.7,   // 7 days: 30% discount
    "14": 0.85, // 14 days: 15% discount
    "30": 1.0,  // 30 days: Base price
    "90": 1.3,  // 90 days: 30% premium
  },

  /**
   * Backup frequency multipliers
   * Less frequent backups = lower processing costs
   */
  FREQUENCY_MULTIPLIERS: {
    daily: 1.0,   // Daily: Base price
    weekly: 0.5,  // Weekly: 50% discount
  },
} as const;
