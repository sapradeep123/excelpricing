import type { Express } from "express";
import type { Server } from "http";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import type { ExchangeRates, Currency } from "@shared/schema";
import { z } from "zod";

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
  if (now - lastFetchTime < CACHE_DURATION && cachedRates.updatedAt !== FALLBACK_RATES.updatedAt) {
    return cachedRates;
  }

  try {
    // Use a free exchange rate API
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
    console.log("Exchange rates updated:", cachedRates.rates);
  } catch (error) {
    console.warn("Failed to fetch exchange rates, using fallback:", error);
    cachedRates = { ...FALLBACK_RATES, updatedAt: new Date().toISOString() };
  }

  return cachedRates;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // List all products/pricing
  app.get(api.products.list.path, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
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
      console.error("Error fetching products by category:", error);
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
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get exchange rates
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await fetchExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // Get single product
  app.get(api.products.get.path, async (req, res) => {
    try {
      const product = await storage.getProduct(Number(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Create a shareable quote
  const createQuoteSchema = z.object({
    items: z.array(z.any()).min(1, "At least one item is required"),
    billingCycle: z.enum(["hourly", "monthly", "yearly"]).default("monthly"),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const result = createQuoteSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0]?.message || "Invalid request" });
      }
      
      const { items, billingCycle, currency } = result.data;
      const id = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
      
      const quote = await storage.createQuote({
        id,
        items,
        billingCycle,
        currency,
        createdAt: new Date(),
        expiresAt,
      });
      
      res.json({ id: quote.id, expiresAt: quote.expiresAt });
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  // Get a quote by ID
  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found or expired" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Sync endpoint - trigger manual sync from API
  app.post("/api/sync", async (req, res) => {
    try {
      console.log("\n🔄 Manual sync triggered via API...");
      const products = await storage.syncFromAPI();
      const categories = Array.from(new Set(products.map((p: { category: string }) => p.category)));
      const productsByCategory: Record<string, { count: number; names: string[] }> = {};
      
      for (const cat of categories) {
        const catProducts = products.filter((p: { category: string }) => p.category === cat);
        productsByCategory[cat] = {
          count: catProducts.length,
          names: catProducts.map((p: { name: string }) => p.name),
        };
      }

      res.json({
        status: "Sync completed",
        totalProducts: products.length,
        categories: productsByCategory,
      });
    } catch (error) {
      console.error("Error during sync:", error);
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // Debug endpoint to show API status and current data
  app.get("/api/debug/status", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const categories = Array.from(new Set(products.map(p => p.category)));
      const productsByCategory: Record<string, { count: number; names: string[] }> = {};
      
      for (const cat of categories) {
        const catProducts = products.filter(p => p.category === cat);
        productsByCategory[cat] = {
          count: catProducts.length,
          names: catProducts.map(p => p.name),
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
      console.error("Error in debug endpoint:", error);
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
