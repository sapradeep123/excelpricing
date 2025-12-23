import { z } from "zod";

// Cart item validation schema
export const cartItemSchema = z.object({
  id: z.string().min(1),
  serviceType: z.enum(["vm", "object-storage", "kubernetes", "veeam"]),
  serviceName: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  hourlyPrice: z.number().min(0).max(1000000),
  monthlyPrice: z.number().min(0).max(100000000),
  config: z.record(z.any()),
});

// Quote creation validation schema
export const createQuoteSchema = z.object({
  items: z.array(cartItemSchema).min(1, "At least one item is required").max(50, "Maximum 50 items allowed"),
  billingCycle: z.enum(["hourly", "monthly", "yearly"]),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  recaptchaToken: z.string().min(1, "reCAPTCHA token is required"),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  search: z.string().max(200).optional(),
});

// Quote ID validation
export const quoteIdSchema = z.string().uuid("Invalid quote ID format");

// Product ID validation
export const productIdSchema = z.coerce.number().int().positive();

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
