import { useQuery } from "@tanstack/react-query";
import type { ExchangeRates, Currency } from "@shared/schema";

export function useExchangeRates() {
  return useQuery<ExchangeRates>({
    queryKey: ["/api/exchange-rates"],
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 30 * 60 * 1000,
  });
}

export function formatCurrency(
  amountINR: number,
  currency: Currency,
  rates: ExchangeRates | undefined
): string {
  if (!rates) {
    return `₹${amountINR.toLocaleString("en-IN")}`;
  }

  const rate = rates.rates[currency];
  const converted = amountINR * rate;

  const formatters: Record<Currency, () => string> = {
    INR: () => `₹${converted.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
    USD: () => `$${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    EUR: () => `€${converted.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    GBP: () => `£${converted.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };

  return formatters[currency]();
}

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: "INR", label: "INR", symbol: "₹" },
  { value: "USD", label: "USD", symbol: "$" },
  { value: "EUR", label: "EUR", symbol: "€" },
  { value: "GBP", label: "GBP", symbol: "£" },
];

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_OPTIONS.find(opt => opt.value === currency)?.symbol || "₹";
}

export function convertCurrency(
  amountINR: number,
  currency: Currency,
  rates: ExchangeRates | undefined
): number {
  if (!rates) return amountINR;
  return amountINR * rates.rates[currency];
}
