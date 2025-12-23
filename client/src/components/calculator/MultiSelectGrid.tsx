import { memo } from "react";
import type { Product, BillingCycle } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useEstimate } from "@/contexts/EstimateContext";
import { formatCurrency } from "@/hooks/use-currency";
import { getPrice, getBillingLabel } from "./SelectionGrid";

interface MultiSelectGridProps {
  title: string;
  items: Product[];
  selected: Product[];
  onToggle: (p: Product) => void;
  icon: any;
}

/**
 * MultiSelectGrid allows selecting multiple products
 * Optimized with memo to prevent unnecessary re-renders
 */
export const MultiSelectGrid = memo(function MultiSelectGrid({
  title,
  items,
  selected,
  onToggle,
  icon: Icon,
}: MultiSelectGridProps) {
  const { billingCycle, currency, exchangeRates } = useEstimate();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="grid gap-3">
        {items.map((item) => {
          const price = getPrice(item, billingCycle);
          const isSelected = selected.some((s) => s.id === item.id);
          return (
            <Card
              key={item.id}
              className={`p-4 cursor-pointer transition-all ${
                isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
              }`}
              onClick={() => onToggle(item)}
              data-testid={`card-${item.category}-${item.id}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox checked={isSelected} />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-primary whitespace-nowrap flex-shrink-0">
                  +{formatCurrency(price, currency, exchangeRates)} {getBillingLabel(billingCycle)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
});
