import type { Product } from "@shared/schema";

const API_BASE = "https://portal.webberstop.com/backend/api";
const API_KEY = process.env.WEBBER_STOP_API_KEY;

if (!API_KEY) {
  throw new Error("WEBBER_STOP_API_KEY environment variable is not set");
}

interface WebberStopPlan {
  id: string;
  name: string;
  cpu: number;
  ram: number;
  storage: number;
  price: number;
  billingPeriod: string;
}

interface WebberStopService {
  id: string;
  name: string;
  category: string;
  plans: WebberStopPlan[];
}

// Fetch and cache pricing data from WebberStop API
let cachedPricing: Product[] | null = null;
let cacheTTL = 0;

async function fetchFromWebberStop(endpoint: string) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      `WebberStop API error: ${response.status} ${response.statusText}`
    );
    throw new Error(`WebberStop API error: ${response.statusText}`);
  }

  return response.json();
}

// Mock pricing data based on typical cloud service offerings
function generateMockPricingData(): Product[] {
  return [
    {
      id: 1,
      name: "Basic VM",
      description: "1 CPU, 1GB RAM, 25GB SSD",
      price: "5.00",
      category: "virtual-machine",
      unit: "per month",
    },
    {
      id: 2,
      name: "Standard VM",
      description: "2 CPU, 4GB RAM, 50GB SSD",
      price: "15.00",
      category: "virtual-machine",
      unit: "per month",
    },
    {
      id: 3,
      name: "Advanced VM",
      description: "4 CPU, 8GB RAM, 100GB SSD",
      price: "35.00",
      category: "virtual-machine",
      unit: "per month",
    },
    {
      id: 4,
      name: "Block Storage",
      description: "High-performance block storage",
      price: "0.10",
      category: "storage",
      unit: "per GB per month",
    },
    {
      id: 5,
      name: "Load Balancer",
      description: "Layer 4 & 7 load balancing",
      price: "20.00",
      category: "networking",
      unit: "per month",
    },
    {
      id: 6,
      name: "Kubernetes Cluster",
      description: "Managed Kubernetes cluster with 3 nodes",
      price: "50.00",
      category: "kubernetes",
      unit: "per month",
    },
    {
      id: 7,
      name: "Additional Snapshot",
      description: "VM or block storage snapshot",
      price: "1.00",
      category: "addon",
      unit: "per snapshot per month",
    },
    {
      id: 8,
      name: "DDoS Protection",
      description: "Advanced DDoS mitigation",
      price: "25.00",
      category: "addon",
      unit: "per month",
    },
  ];
}

export async function getPricingData(): Promise<Product[]> {
  // Return cached data if still fresh (cache for 1 hour)
  if (cachedPricing && cacheTTL > Date.now()) {
    return cachedPricing;
  }

  try {
    // Try to fetch real data from WebberStop API
    // For now, we'll use mock data since the API doesn't expose a direct pricing endpoint
    // In production, you would parse the plans from actual service endpoints
    cachedPricing = generateMockPricingData();
    cacheTTL = Date.now() + 60 * 60 * 1000; // Cache for 1 hour
    return cachedPricing;
  } catch (error) {
    console.error("Failed to fetch pricing data:", error);
    // Return mock data as fallback
    return generateMockPricingData();
  }
}

export async function verifyApiKey(): Promise<boolean> {
  try {
    // Test the API key by making a simple request
    const response = await fetch(`${API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
