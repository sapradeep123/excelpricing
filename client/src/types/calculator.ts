import type { Product, BillingCycle, Currency, ExchangeRates } from "@shared/schema";

export type ServiceType = "vm" | "object-storage" | "kubernetes" | "veeam" | null;
export type ViewMode = "landing" | "catalog" | "configure" | "review";

export interface CartItem {
  id: string;
  serviceType: ServiceType;
  serviceName: string;
  config: Record<string, any>;
  hourlyPrice: number;
  monthlyPrice: number;
  description: string;
}

export interface EstimateContextType {
  items: CartItem[];
  billingCycle: BillingCycle;
  currency: Currency;
  exchangeRates?: ExchangeRates;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearEstimate: () => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  setCurrency: (currency: Currency) => void;
  editItem: (id: string) => void;
}

export interface ConfiguratorProps {
  products: Record<string, Product[]>;
  selectedRegion: string;
  onComplete: (item: Omit<CartItem, "id">) => void;
  onCancel: () => void;
}

export interface SimpleConfiguratorProps {
  products: Product[];
  onComplete: (item: Omit<CartItem, "id">) => void;
  onCancel: () => void;
}
