import { pgTable, text, serial, integer, numeric, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  unit: text("unit").notNull(),
  priceHourly: numeric("price_hourly").notNull(),
  priceMonthly: numeric("price_monthly").notNull(),
  priceYearly: numeric("price_yearly").notNull(),
}, (table) => ({
  // Unique constraint for UPSERT operations
  nameCategory: unique().on(table.name, table.category),
}));

// Saved quotes for shareable URLs (expires after 30 days)
export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(), // UUID for shareable URL
  items: jsonb("items").notNull(), // Array of cart items
  billingCycle: text("billing_cycle").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// === BASE SCHEMAS ===
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertQuoteSchema = createInsertSchema(quotes);

// === EXPLICIT API CONTRACT TYPES ===
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

// Response types
export type ProductResponse = Product;
export type ProductsListResponse = Product[];

// Billing cycle type
export type BillingCycle = "hourly" | "monthly" | "yearly";

// Currency types
export type Currency = "INR" | "USD" | "EUR" | "GBP";

export interface ExchangeRates {
  base: "INR";
  rates: Record<Currency, number>;
  updatedAt: string;
}

// Calculator types (frontend helper types)
export interface CartItem extends Product {
  quantity: number;
}
