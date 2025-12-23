import type { Express } from "express";
import type { Server } from "http";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import type { ExchangeRates } from "@shared/schema";
import { logInfo, logError, logWarn } from "./logger";
import {
  apiLimiter,
  quoteCreationLimiter,
  syncLimiter,
  exchangeRatesLimiter,
} from "./middleware/rateLimiter";
import { verifyRecaptcha } from "./middleware/recaptcha";
import { sanitizeQuoteItems } from "./utils/sanitize";
import {
  createQuoteSchema,
  paginationSchema,
  quoteIdSchema,
  productIdSchema,
} from "./validation/schemas";
import {
  healthCheckHandler,
  livenessCheckHandler,
  readinessCheckHandler,
} from "./utils/healthCheck";

// Fallback exchange rates (INR base)
const FALLBACK_RATES: ExchangeRates = {
  base: "INR",
  rates: {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0094,
  },
  updatedAt: new Date().toISOString(),
};

let cachedRates: ExchangeRates = FALLBACK_RATES;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function fetchExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (
    now - lastFetchTime < CACHE_DURATION &&
    cachedRates.updatedAt !== FALLBACK_RATES.updatedAt
  ) {
    return cachedRates;
  }

  try {
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/INR"
    );
    if (!response.ok) throw new Error("Failed to fetch rates");

    const data = await response.json();
    cachedRates = {
      base: "INR",
      rates: {
        INR: 1,
        USD: data.rates.USD || FALLBACK_RATES.rates.USD,
        EUR: data.rates.EUR || FALLBACK_RATES.rates.EUR,
        GBP: data.rates.GBP || FALLBACK_RATES.rates.GBP,
      },
      updatedAt: new Date().toISOString(),
    };
    lastFetchTime = now;
    logInfo("Exchange rates updated", { rates: cachedRates.rates });
  } catch (error) {
    logWarn("Failed to fetch exchange rates, using fallback", { error });
    cachedRates = { ...FALLBACK_RATES, updatedAt: new Date().toISOString() };
  }

  return cachedRates;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoints (no rate limiting)
  app.get("/health", healthCheckHandler);
  app.get("/health/live", livenessCheckHandler);
  app.get("/health/ready", readinessCheckHandler);

  // Apply API rate limiter to all /api routes
  app.use("/api", apiLimiter);

  // List all products/pricing with pagination
  app.get(api.products.list.path, async (req, res) => {
    try {
      const validation = paginationSchema.safeParse(req.query);

      if (!validation.success) {
        logWarn("Invalid pagination parameters", {
          errors: validation.error.errors,
        });
        return res.status(400).json({
          message: "Invalid pagination parameters",
          errors: validation.error.errors,
        });
      }

      const { page, limit, category, search } = validation.data;
      const result = await storage.getProductsPaginated(
        page,
        limit,
        category,
        search
      );

      res.json(result);
    } catch (error) {
      logError("Error fetching products", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get products by category
  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const filtered = products.filter(
        (p) => p.category === req.params.category
      );
      res.json(filtered);
    } catch (error) {
      logError("Error fetching products by category", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get categories
  app.get("/api/categories", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const categories = Array.from(new Set(products.map((p) => p.category)));
      const categoryInfo = categories.map((cat) => ({
        id: cat,
        name: formatCategoryName(cat),
        icon: getCategoryIcon(cat),
        description: getCategoryDescription(cat),
      }));
      res.json(categoryInfo);
    } catch (error) {
      logError("Error fetching categories", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get exchange rates (with specific rate limiter)
  app.get("/api/exchange-rates", exchangeRatesLimiter, async (req, res) => {
    try {
      const rates = await fetchExchangeRates();
      res.json(rates);
    } catch (error) {
      logError("Error fetching exchange rates", error);
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // Get single product
  app.get(api.products.get.path, async (req, res) => {
    try {
      const validation = productIdSchema.safeParse(req.params.id);

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getProduct(validation.data);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      logError("Error fetching product", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Create a shareable quote (with reCAPTCHA and rate limiting)
  app.post(
    "/api/quotes",
    quoteCreationLimiter,
    verifyRecaptcha,
    async (req, res) => {
      try {
        const validation = createQuoteSchema.safeParse(req.body);

        if (!validation.success) {
          logWarn("Invalid quote creation request", {
            errors: validation.error.errors,
            ip: req.ip,
          });
          return res.status(400).json({
            message: validation.error.errors[0]?.message || "Invalid request",
            errors: validation.error.errors,
          });
        }

        const { items, billingCycle, currency } = validation.data;

        // Sanitize items to prevent XSS
        const sanitizedItems = sanitizeQuoteItems(items);

        const id = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        const quote = await storage.createQuote({
          id,
          items: sanitizedItems,
          billingCycle,
          currency,
          createdAt: new Date(),
          expiresAt,
        });

        logInfo("Quote created", {
          quoteId: quote.id,
          itemCount: items.length,
          ip: req.ip,
        });

        res.json({ id: quote.id, expiresAt: quote.expiresAt });
      } catch (error) {
        logError("Error creating quote", error, { ip: req.ip });
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  );

  // Get a quote by ID
  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const validation = quoteIdSchema.safeParse(req.params.id);

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid quote ID format" });
      }

      const quote = await storage.getQuote(validation.data);
      if (!quote) {
        return res
          .status(404)
          .json({ message: "Quote not found or expired" });
      }
      res.json(quote);
    } catch (error) {
      logError("Error fetching quote", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Sync endpoint - trigger manual sync from API (with strict rate limiting)
  app.post("/api/sync", syncLimiter, async (req, res) => {
    try {
      logInfo("Manual sync triggered via API", { ip: req.ip });
      const products = await storage.syncFromAPI();
      const categories = Array.from(
        new Set(products.map((p: { category: string }) => p.category))
      );
      const productsByCategory: Record<
        string,
        { count: number; names: string[] }
      > = {};

      for (const cat of categories) {
        const catProducts = products.filter(
          (p: { category: string }) => p.category === cat
        );
        productsByCategory[cat] = {
          count: catProducts.length,
          names: catProducts.map((p: { name: string }) => p.name),
        };
      }

      logInfo("Sync completed", { totalProducts: products.length });

      res.json({
        status: "Sync completed",
        totalProducts: products.length,
        categories: productsByCategory,
      });
    } catch (error) {
      logError("Error during sync", error, { ip: req.ip });
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // Debug endpoint to show API status and current data
  app.get("/api/debug/status", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const categories = Array.from(new Set(products.map((p) => p.category)));
      const productsByCategory: Record<
        string,
        { count: number; names: string[] }
      > = {};

      for (const cat of categories) {
        const catProducts = products.filter((p) => p.category === cat);
        productsByCategory[cat] = {
          count: catProducts.length,
          names: catProducts.map((p) => p.name),
        };
      }

      res.json({
        status: "Using fallback data (API returned 403 Forbidden)",
        note: "The WebberStop API is not accessible. Contact WebberStop to verify API key permissions.",
        apiEndpoint: "https://portal.webberstop.com/backend/api",
        totalProducts: products.length,
        categories: productsByCategory,
        products: products,
      });
    } catch (error) {
      logError("Error in debug endpoint", error);
      res.status(500).json({ message: "Debug endpoint error" });
    }
  });

  return httpServer;
}

function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    "virtual-machine": "Compute",
    storage: "Storage",
    networking: "Networking",
    kubernetes: "Kubernetes",
    autoscale: "Auto Scaling",
  };
  return names[category] || category.replace(/-/g, " ").toUpperCase();
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "virtual-machine": "💻",
    storage: "💾",
    networking: "🌐",
    kubernetes: "☸️",
    autoscale: "📈",
  };
  return icons[category] || "⚙️";
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    "virtual-machine":
      "Virtual machines for running your applications and workloads",
    storage: "Block and object storage for your data",
    networking:
      "Load balancers, VPC, and elastic IP addresses for network management",
    kubernetes: "Managed Kubernetes clusters for container orchestration",
    autoscale: "Automatic scaling to handle traffic variations",
  };
  return descriptions[category] || "";
}
