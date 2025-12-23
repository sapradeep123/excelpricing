import { memo } from "react";
import type { Product, BillingCycle, Currency, ExchangeRates } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useEstimate } from "@/contexts/EstimateContext";
import { formatCurrency } from "@/hooks/use-currency";

interface SelectionGridProps {
  title?: React.ReactNode;
  items: Product[];
  selected: Product | null;
  onSelect: (p: Product) => void;
  icon: any;
  showPrice?: boolean;
  allowDeselect?: boolean;
}

function getPrice(item: Product, billingCycle: BillingCycle): number {
  if (billingCycle === "hourly") return Number(item.priceHourly);
  if (billingCycle === "yearly") return Number(item.priceMonthly) * 12 * 0.9;
  return Number(item.priceMonthly);
}

function getBillingLabel(cycle: BillingCycle): string {
  if (cycle === "hourly") return "/hr";
  if (cycle === "yearly") return "/yr";
  return "/mo";
}

/**
 * SelectionGrid displays a grid of selectable product cards
 * Memoized to prevent re-renders when parent state changes
 */
export const SelectionGrid = memo(function SelectionGrid({
  title,
  items,
  selected,
  onSelect,
  icon: Icon,
  showPrice = false,
  allowDeselect = false,
}: SelectionGridProps) {
  const { billingCycle, currency, exchangeRates } = useEstimate();

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <div className="grid gap-3">
        {items.map((item) => {
          const price = getPrice(item, billingCycle);
          return (
            <Card
              key={item.id}
              className={`p-4 cursor-pointer transition-all ${
                selected?.id === item.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
              }`}
              onClick={() => onSelect(item)}
              data-testid={`card-${item.category}-${item.id}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {showPrice && price > 0 && (
                    <span className="text-sm font-medium text-primary whitespace-nowrap">
                      {formatCurrency(price, currency, exchangeRates)} {getBillingLabel(billingCycle)}
                    </span>
                  )}
                  {selected?.id === item.id && <Check className="w-5 h-5 text-primary" />}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

export { getPrice, getBillingLabel };
