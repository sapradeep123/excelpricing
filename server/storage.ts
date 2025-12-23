import type { Product, Quote, InsertQuote } from "@shared/schema";
import { products as productsTable, quotes as quotesTable } from "@shared/schema";
import { db } from "./db";
import { eq, lt } from "drizzle-orm";
import cron from "node-cron";

const API_BASE = "https://portal.webberstop.com/backend/api";
const ADMIN_API_KEY = process.env.WEBBER_STOP_ADMIN_API_KEY;

// Conversion constants for pricing cadences
const HOURS_PER_MONTH = 730;
const MONTHS_PER_YEAR = 12;

if (!ADMIN_API_KEY) {
  console.warn("WEBBER_STOP_ADMIN_API_KEY not set, using fallback data");
}

let syncInProgress = false;

async function fetchFromAdminAPI(service: string): Promise<any> {
  if (!ADMIN_API_KEY) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const url = `${API_BASE}/admin/plans/service/${encodeURIComponent(service)}?planable_type=RateCard&planable=default&include=cloud_provider,plan_region,storage_category&sort=-created_at&page=1&limit=200`;
    
    console.log(`  Fetching: ${service} plans from admin API...`);
    
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${ADMIN_API_KEY}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`  API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`  Fetch error:`, error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Calculate pricing for all cadences
function calculatePricingCadences(hourlyPrice: number | null, monthlyPrice: number | null, yearlyPrice: number | null) {
  let hourly = hourlyPrice || 0;
  let monthly = monthlyPrice || 0;
  let yearly = yearlyPrice || 0;

  // If we have monthly but not hourly, calculate hourly
  if (monthly > 0 && hourly === 0) {
    hourly = monthly / HOURS_PER_MONTH;
  }
  
  // If we have hourly but not monthly, calculate monthly
  if (hourly > 0 && monthly === 0) {
    monthly = hourly * HOURS_PER_MONTH;
  }
  
  // If we have monthly but not yearly, calculate yearly (with 10% discount)
  if (monthly > 0 && yearly === 0) {
    yearly = monthly * MONTHS_PER_YEAR * 0.9; // 10% yearly discount
  }
  
  // If we have yearly but not monthly, calculate monthly
  if (yearly > 0 && monthly === 0) {
    monthly = yearly / MONTHS_PER_YEAR / 0.9;
  }

  return {
    hourly: parseFloat(hourly.toFixed(2)),
    monthly: parseFloat(monthly.toFixed(2)),
    yearly: parseFloat(yearly.toFixed(2)),
  };
}

// Sync pricing data from API to database
async function syncPricingFromAPI(): Promise<Product[]> {
  if (syncInProgress) {
    console.log("Sync already in progress, skipping...");
    return [];
  }

  syncInProgress = true;
  const products: Product[] = [];
  let id = 1;
  const processedPlans = new Set<string>();

  try {
    console.log("\n📡 Starting API sync from admin API (default rate card)...");

    // Services to fetch from admin API (using exact API service names)
    const services = [
      { name: "Virtual Machine", category: "compute" },
      { name: "Block Storage", category: "storage" },
      { name: "Load Balancer", category: "networking-lb" },
      { name: "Kubernetes", category: "k8s-compute" },
      { name: "Object Storage", category: "object-storage" },
      { name: "IP Address", category: "networking-ip" },
      { name: "Virtual Router", category: "networking-vpc" },
      { name: "Veeam Backup", category: "veeam" },
    ];

    for (const service of services) {
      try {
        const apiData = await fetchFromAdminAPI(service.name);
        
        if (!apiData || apiData.status !== "Success" || !apiData.data || !Array.isArray(apiData.data)) {
          console.log(`  No data found for ${service.name}`);
          continue;
        }

        console.log(`  Found ${apiData.data.length} ${service.name} plans`);

        for (const plan of apiData.data) {
          if (!plan.name || !plan.status) continue;
          
          const planKey = `${service.category}-${plan.id}`;
          if (processedPlans.has(planKey)) continue;
          processedPlans.add(planKey);

          // Extract pricing from plan
          const hourlyRaw = parseFloat(plan.hourly_price) || null;
          const monthlyRaw = parseFloat(plan.monthly_price) || null;
          const yearlyRaw = null; // Calculate from monthly
          
          const pricing = calculatePricingCadences(hourlyRaw, monthlyRaw, yearlyRaw);
          
          if (pricing.monthly > 0) {
            // Extract CPU/memory from attribute
            const attr = plan.attribute || {};
            const cpu = attr.cpu || attr.formatted_cpu || 0;
            const memoryMB = attr.memory || 0;
            const memoryGB = memoryMB > 0 ? (memoryMB / 1024).toFixed(1) : "0";
            
            // Determine subcategory from plan name or category
            let subcategory = plan.plan_category?.name || null;
            if (!subcategory && plan.name) {
              if (plan.name.startsWith("C1_") || plan.name.startsWith("CI_")) subcategory = "CPU Intensive";
              else if (plan.name.startsWith("M1_") || plan.name.startsWith("MI_")) subcategory = "Memory Intensive";
              else if (plan.name.startsWith("BP_")) subcategory = "Basic Compute Plans";
              else subcategory = "Standard";
            }
            
            const description = cpu > 0 && memoryMB > 0 
              ? `${cpu} vCPU, ${memoryGB} GB RAM`
              : plan.description || plan.name;
            
            products.push({
              id: id++,
              name: plan.name,
              description: description,
              category: service.category,
              subcategory: subcategory,
              unit: "per month",
              priceHourly: pricing.hourly.toString(),
              priceMonthly: pricing.monthly.toString(),
              priceYearly: pricing.yearly.toString(),
            });
            console.log(`  Added: ${plan.name} - ₹${pricing.hourly}/hr, ₹${pricing.monthly}/mo`);
          }
        }
      } catch (error) {
        console.warn(`  Could not fetch ${service.name}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`\n💾 Total products from API: ${products.length}`);

    // If insufficient products, use comprehensive fallback
    if (products.length < 5) {
      console.log("⚠️  API pricing data limited, using comprehensive fallback data");
      products.length = 0;
      products.push(...getComprehensiveFallbackData());
    } else {
      // Add supplemental data (regions, OS, addons) that aren't in the API
      console.log("  Adding supplemental data (regions, OS, addons)...");
      const supplemental = getSupplementalData(id);
      products.push(...supplemental);
    }

    // Clear old products and insert new ones
    await db.delete(productsTable);
    await db.insert(productsTable).values(products);
    console.log("✓ Database synced successfully\n");

    return products;
  } catch (error) {
    console.error("❌ Error syncing pricing data:", error);
    return [];
  } finally {
    syncInProgress = false;
  }
}

function getSupplementalData(startId: number): Product[] {
  const supplemental = [
    // Regions
    { name: "Mumbai (IN-West)", desc: "India West Region", cat: "region", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Delhi (IN-North)", desc: "India North Region", cat: "region", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Bangalore (IN-South)", desc: "India South Region", cat: "region", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "NOIDA", desc: "India NCR Region", cat: "region", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    
    // Operating Systems - Linux (free)
    { name: "Ubuntu 24.04 LTS", desc: "Latest Long Term Support release", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Ubuntu 22.04 LTS", desc: "Long Term Support release", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Ubuntu 20.04 LTS", desc: "Previous LTS release", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "CentOS Stream 9", desc: "Latest CentOS Stream", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "CentOS 8", desc: "Enterprise Linux", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Debian 12", desc: "Bookworm - Latest stable", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Debian 11", desc: "Bullseye - Previous stable", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Rocky Linux 9", desc: "Enterprise Linux 9", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "AlmaLinux 9", desc: "Enterprise Linux 9", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    
    // Operating Systems - Windows (paid license)
    { name: "Windows Server 2022", desc: "Microsoft Windows Server (License included)", cat: "os", subcat: "Windows", hourly: 2.50, monthly: 1825, yearly: 19710 },
    { name: "Windows Server 2019", desc: "Microsoft Windows Server (License included)", cat: "os", subcat: "Windows", hourly: 2.50, monthly: 1825, yearly: 19710 },
    
    // VM Addons - Backup
    { name: "Automated Backup", desc: "Daily automated backups with 7-day retention", cat: "addon", subcat: "Backup", hourly: 0.41, monthly: 300, yearly: 3240 },
    { name: "VM Snapshot", desc: "Point-in-time VM snapshots for instant recovery", cat: "addon", subcat: "Backup", hourly: 0.21, monthly: 150, yearly: 1620 },
    { name: "Volume Backup", desc: "Block volume backups with configurable retention", cat: "addon", subcat: "Backup", hourly: 0.34, monthly: 250, yearly: 2700 },
    
    // VM Addons - Monitoring
    { name: "Monitoring Basic", desc: "Basic monitoring and alerting", cat: "addon", subcat: "Monitoring", hourly: 0.14, monthly: 100, yearly: 1080 },
    { name: "Monitoring Advanced", desc: "Advanced monitoring with custom dashboards", cat: "addon", subcat: "Monitoring", hourly: 0.27, monthly: 200, yearly: 2160 },
    
    // VM Addons - Security (Windows only - Antivirus)
    { name: "Antivirus - Windows Defender ATP", desc: "Microsoft Defender for Windows VMs", cat: "addon-windows", subcat: "Security", hourly: 0.41, monthly: 300, yearly: 3240 },
    { name: "Antivirus - Trend Micro", desc: "Trend Micro Deep Security for Windows", cat: "addon-windows", subcat: "Security", hourly: 0.55, monthly: 400, yearly: 4320 },
    
    // Kubernetes options
    { name: "Kubernetes 1.28", desc: "Latest stable release", cat: "k8s-version", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Kubernetes 1.27", desc: "Previous stable release", cat: "k8s-version", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Kubernetes 1.26", desc: "LTS release", cat: "k8s-version", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "High Availability", desc: "Multi-master HA configuration", cat: "k8s-ha", subcat: null, hourly: 6.85, monthly: 5000, yearly: 54000 },
  ];
  
  return supplemental.map((p, idx) => ({
    id: startId + idx,
    name: p.name,
    description: p.desc,
    category: p.cat,
    subcategory: p.subcat,
    unit: "per month",
    priceHourly: p.hourly.toString(),
    priceMonthly: p.monthly.toString(),
    priceYearly: p.yearly.toString(),
  }));
}

function getComprehensiveFallbackData(): Product[] {
  const plans = [
    // ============ VM SERVICE ============
    // Regions (no cost, just selection)
    { name: "Mumbai (IN-West)", desc: "India West Region", cat: "region", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Delhi (IN-North)", desc: "India North Region", cat: "region", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Bangalore (IN-South)", desc: "India South Region", cat: "region", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    
    // Operating Systems (no cost, just selection)
    { name: "Ubuntu 24.04 LTS", desc: "Latest Long Term Support release", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Ubuntu 22.04 LTS", desc: "Long Term Support release", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Ubuntu 20.04 LTS", desc: "Previous LTS release", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "CentOS Stream 9", desc: "Latest CentOS Stream", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "CentOS 8", desc: "Enterprise Linux", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Debian 12", desc: "Bookworm - Latest stable", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Debian 11", desc: "Bullseye - Previous stable", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Rocky Linux 9", desc: "Enterprise Linux 9", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "AlmaLinux 9", desc: "Enterprise Linux 9", cat: "os", subcat: "Linux", hourly: 0, monthly: 0, yearly: 0 },
    { name: "Windows Server 2022", desc: "Microsoft Windows Server", cat: "os", subcat: "Windows", hourly: 2.50, monthly: 1825, yearly: 19710 },
    { name: "Windows Server 2019", desc: "Microsoft Windows Server", cat: "os", subcat: "Windows", hourly: 2.50, monthly: 1825, yearly: 19710 },
    
    // Compute - Basic Plans (5 plans)
    { name: "BP_4vC-8GB", desc: "4 vCPU, 8.0 GB RAM", cat: "compute", subcat: "Basic Compute Plans", hourly: 9.40, monthly: 3440, yearly: 37152 },
    { name: "BP_8vC-16GB", desc: "8 vCPU, 16.0 GB RAM", cat: "compute", subcat: "Basic Compute Plans", hourly: 18.80, monthly: 6880, yearly: 74304 },
    { name: "BP_8vC-32GB", desc: "8 vCPU, 32.0 GB RAM", cat: "compute", subcat: "Basic Compute Plans", hourly: 15.52, monthly: 11360, yearly: 122688 },
    { name: "BP_16vC-32GB", desc: "16 vCPU, 32.0 GB RAM", cat: "compute", subcat: "Basic Compute Plans", hourly: 18.80, monthly: 13760, yearly: 148608 },
    { name: "BP_16vC-64GB", desc: "16 vCPU, 64.0 GB RAM", cat: "compute", subcat: "Basic Compute Plans", hourly: 31.04, monthly: 22720, yearly: 245376 },
    
    // Compute - CPU Intensive (3 plans)
    { name: "CI_32vC-64GB", desc: "32 vCPU, 64.0 GB RAM", cat: "compute", subcat: "CPU Intensive", hourly: 37.60, monthly: 27520, yearly: 297216 },
    { name: "CI_32vC-128GB", desc: "32 vCPU, 128.0 GB RAM", cat: "compute", subcat: "CPU Intensive", hourly: 62.08, monthly: 45440, yearly: 490752 },
    { name: "CI_48vC-96GB", desc: "48 vCPU, 96.0 GB RAM", cat: "compute", subcat: "CPU Intensive", hourly: 56.39, monthly: 41280, yearly: 445824 },
    
    // Compute - Memory Intensive (6 plans)
    { name: "MI_1vC-8GB", desc: "1 vCPU, 8.0 GB RAM", cat: "compute", subcat: "Memory Intensive", hourly: 3.47, monthly: 2540, yearly: 27432 },
    { name: "MI_2vC-16GB", desc: "2 vCPU, 16.0 GB RAM", cat: "compute", subcat: "Memory Intensive", hourly: 6.94, monthly: 5080, yearly: 54864 },
    { name: "MI_4vC-16GB", desc: "4 vCPU, 16.0 GB RAM", cat: "compute", subcat: "Memory Intensive", hourly: 7.76, monthly: 5680, yearly: 61344 },
    { name: "MI_4vC-32GB", desc: "4 vCPU, 32.0 GB RAM", cat: "compute", subcat: "Memory Intensive", hourly: 13.88, monthly: 10160, yearly: 109728 },
    { name: "MI_8vC-64GB", desc: "8 vCPU, 64.0 GB RAM", cat: "compute", subcat: "Memory Intensive", hourly: 27.76, monthly: 20320, yearly: 219456 },
    { name: "MI_16vC-128GB", desc: "16 vCPU, 128.0 GB RAM", cat: "compute", subcat: "Memory Intensive", hourly: 55.52, monthly: 40640, yearly: 438912 },
    
    // Block Storage options
    { name: "50 GB Block Storage", desc: "50 GB NVMe SSD", cat: "storage", subcat: "Block Storage", hourly: 0.58, monthly: 425, yearly: 4590 },
    { name: "100 GB Block Storage", desc: "100 GB NVMe SSD", cat: "storage", subcat: "Block Storage", hourly: 1.16, monthly: 850, yearly: 9180 },
    { name: "250 GB Block Storage", desc: "250 GB NVMe SSD", cat: "storage", subcat: "Block Storage", hourly: 2.91, monthly: 2125, yearly: 22950 },
    { name: "500 GB Block Storage", desc: "500 GB NVMe SSD", cat: "storage", subcat: "Block Storage", hourly: 5.82, monthly: 4250, yearly: 45900 },
    { name: "1 TB Block Storage", desc: "1 TB NVMe SSD", cat: "storage", subcat: "Block Storage", hourly: 11.64, monthly: 8500, yearly: 91800 },
    
    // Networking options
    { name: "Elastic IP", desc: "Static public IP address", cat: "networking-ip", subcat: "IP Addresses", hourly: 0.14, monthly: 100, yearly: 1080 },
    { name: "Load Balancer", desc: "Distribute traffic across multiple instances", cat: "networking-lb", subcat: "Load Balancers", hourly: 2.05, monthly: 1500, yearly: 16200 },
    { name: "VPC", desc: "Virtual Private Cloud - Isolated network for your resources", cat: "networking-vpc", subcat: "VPC", hourly: 0.68, monthly: 500, yearly: 5400 },
    
    // VM Addons
    { name: "Automated Backup", desc: "Daily automated backups with 7-day retention", cat: "addon", subcat: "Backup", hourly: 0.41, monthly: 300, yearly: 3240 },
    { name: "VM Snapshot", desc: "Point-in-time VM snapshots for instant recovery", cat: "addon", subcat: "Backup", hourly: 0.21, monthly: 150, yearly: 1620 },
    { name: "Volume Backup", desc: "Block volume backups with configurable retention", cat: "addon", subcat: "Backup", hourly: 0.34, monthly: 250, yearly: 2700 },
    { name: "Monitoring", desc: "Advanced monitoring and alerting", cat: "addon", subcat: "Monitoring", hourly: 0.27, monthly: 200, yearly: 2160 },
    { name: "DDoS Protection", desc: "Enhanced DDoS protection", cat: "addon", subcat: "Security", hourly: 0.68, monthly: 500, yearly: 5400 },
    { name: "Managed Database", desc: "Managed PostgreSQL/MySQL", cat: "addon", subcat: "Database", hourly: 1.37, monthly: 1000, yearly: 10800 },
    
    // ============ OBJECT STORAGE SERVICE ============
    { name: "Object Storage - 100 GB", desc: "100 GB S3-compatible storage", cat: "object-storage", subcat: "Packages", hourly: 0.34, monthly: 250, yearly: 2700 },
    { name: "Object Storage - 500 GB", desc: "500 GB S3-compatible storage", cat: "object-storage", subcat: "Packages", hourly: 1.37, monthly: 1000, yearly: 10800 },
    { name: "Object Storage - 1 TB", desc: "1 TB S3-compatible storage", cat: "object-storage", subcat: "Packages", hourly: 2.47, monthly: 1800, yearly: 19440 },
    { name: "Object Storage - 5 TB", desc: "5 TB S3-compatible storage", cat: "object-storage", subcat: "Packages", hourly: 10.27, monthly: 7500, yearly: 81000 },
    { name: "Object Storage - 10 TB", desc: "10 TB S3-compatible storage", cat: "object-storage", subcat: "Packages", hourly: 17.81, monthly: 13000, yearly: 140400 },
    
    // ============ KUBERNETES SERVICE ============
    // K8s Versions
    { name: "Kubernetes 1.28", desc: "Latest stable release", cat: "k8s-version", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Kubernetes 1.27", desc: "Previous stable release", cat: "k8s-version", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    { name: "Kubernetes 1.26", desc: "LTS release", cat: "k8s-version", subcat: null, hourly: 0, monthly: 0, yearly: 0 },
    
    // K8s Compute Plans (worker node specs)
    { name: "K8s-2vC-4GB", desc: "2 vCPU, 4 GB RAM per node", cat: "k8s-compute", subcat: "Standard", hourly: 4.11, monthly: 3000, yearly: 32400 },
    { name: "K8s-4vC-8GB", desc: "4 vCPU, 8 GB RAM per node", cat: "k8s-compute", subcat: "Standard", hourly: 8.22, monthly: 6000, yearly: 64800 },
    { name: "K8s-8vC-16GB", desc: "8 vCPU, 16 GB RAM per node", cat: "k8s-compute", subcat: "Standard", hourly: 16.44, monthly: 12000, yearly: 129600 },
    { name: "K8s-16vC-32GB", desc: "16 vCPU, 32 GB RAM per node", cat: "k8s-compute", subcat: "High Performance", hourly: 32.88, monthly: 24000, yearly: 259200 },
    { name: "K8s-32vC-64GB", desc: "32 vCPU, 64 GB RAM per node", cat: "k8s-compute", subcat: "High Performance", hourly: 65.75, monthly: 48000, yearly: 518400 },
    
    // K8s High Availability
    { name: "High Availability", desc: "Multi-master HA configuration", cat: "k8s-ha", subcat: null, hourly: 6.85, monthly: 5000, yearly: 54000 },
    
    // ============ VEEAM BACKUP SERVICE ============
    { name: "Veeam Backup - 100 GB", desc: "100 GB backup storage", cat: "veeam", subcat: "Capacity", hourly: 0.55, monthly: 400, yearly: 4320 },
    { name: "Veeam Backup - 500 GB", desc: "500 GB backup storage", cat: "veeam", subcat: "Capacity", hourly: 2.05, monthly: 1500, yearly: 16200 },
    { name: "Veeam Backup - 1 TB", desc: "1 TB backup storage", cat: "veeam", subcat: "Capacity", hourly: 3.42, monthly: 2500, yearly: 27000 },
    { name: "Veeam Backup - 5 TB", desc: "5 TB backup storage", cat: "veeam", subcat: "Capacity", hourly: 13.70, monthly: 10000, yearly: 108000 },
    { name: "Veeam Backup - 10 TB", desc: "10 TB backup storage", cat: "veeam", subcat: "Capacity", hourly: 23.97, monthly: 17500, yearly: 189000 },
  ];

  return plans.map((p, idx) => ({
    id: idx + 1,
    name: p.name,
    description: p.desc,
    category: p.cat,
    subcategory: p.subcat,
    unit: "per month",
    priceHourly: p.hourly.toFixed(2),
    priceMonthly: p.monthly.toFixed(2),
    priceYearly: p.yearly.toFixed(2),
  }));
}

// Get products from database
async function getProductsFromDB(): Promise<Product[]> {
  try {
    const data = await db.select().from(productsTable);
    return data;
  } catch (error) {
    console.error("Error fetching from database:", error);
    return [];
  }
}

// Initialize pricing data on startup
export async function initializePricing(): Promise<void> {
  console.log("🚀 Initializing pricing system...");

  try {
    await syncPricingFromAPI();

    console.log("⏰ Setting up cron job for periodic sync (every 30 minutes)...");
    cron.schedule("*/30 * * * *", async () => {
      console.log("\n📅 Cron job triggered - syncing pricing data...");
      await syncPricingFromAPI();
    });

    console.log("✓ Pricing system initialized\n");
  } catch (error) {
    console.error("Error initializing pricing:", error);
  }
}

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuote(id: string): Promise<Quote | undefined>;
  cleanupExpiredQuotes(): Promise<void>;
  syncFromAPI(): Promise<Product[]>;
}

export class PricingStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await getProductsFromDB();
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const products = await getProductsFromDB();
    return products.find((p) => p.id === id);
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotesTable).values(quote).returning();
    return created;
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, id));
    if (quote && new Date(quote.expiresAt) < new Date()) {
      return undefined; // Quote expired
    }
    return quote;
  }

  async cleanupExpiredQuotes(): Promise<void> {
    await db.delete(quotesTable).where(lt(quotesTable.expiresAt, new Date()));
  }

  async syncFromAPI(): Promise<Product[]> {
    return await syncPricingFromAPI();
  }
}

export const storage = new PricingStorage();
