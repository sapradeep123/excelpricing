import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Trash2, Pencil } from "lucide-react";
import { useEstimate } from "@/contexts/EstimateContext";
import { formatCurrency, CURRENCY_OPTIONS } from "@/hooks/use-currency";
import type { BillingCycle } from "@shared/schema";

const BILLING_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/**
 * EstimateSidebar displays the current estimate with controls
 * Heavily memoized to prevent re-renders on parent state changes
 */
export const EstimateSidebar = memo(function EstimateSidebar() {
  const {
    items,
    billingCycle,
    currency,
    exchangeRates,
    removeItem,
    clearEstimate,
    setBillingCycle,
    setCurrency,
    editItem,
  } = useEstimate();

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (billingCycle === "hourly") return sum + item.hourlyPrice;
      if (billingCycle === "yearly") return sum + item.monthlyPrice * 12 * 0.9;
      return sum + item.monthlyPrice;
    }, 0);
  }, [items, billingCycle]);

  return (
    <Card className="p-6 bg-secondary/30 sticky top-20">
      <h2 className="text-lg font-semibold mb-4">My Estimate</h2>

      {/* Billing Cycle Selector */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <label className="text-sm text-muted-foreground">Billing Cycle</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Yearly plans include a 10% discount.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          {BILLING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setBillingCycle(option.value)}
              className={`flex-1 px-2 py-1.5 text-sm font-medium rounded transition-colors ${
                billingCycle === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`button-billing-${option.value}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Currency Selector */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <label className="text-sm text-muted-foreground">Currency</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Prices converted using live exchange rates</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setCurrency(option.value)}
              className={`flex-1 px-2 py-1.5 text-sm font-medium rounded transition-colors ${
                currency === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`button-currency-${option.value}`}
            >
              {option.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No services added yet
          </p>
        ) : (
          items.map((item) => {
            let price = item.monthlyPrice;
            if (billingCycle === "hourly") price = item.hourlyPrice;
            if (billingCycle === "yearly") price = item.monthlyPrice * 12 * 0.9;

            return (
              <EstimateItem
                key={item.id}
                item={item}
                price={price}
                currency={currency}
                exchangeRates={exchangeRates}
                onEdit={editItem}
                onRemove={removeItem}
              />
            );
          })
        )}
      </div>

      {/* Total */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary" data-testid="text-total-price">
            {formatCurrency(total, currency, exchangeRates)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {billingCycle === "hourly" ? "per hour" : billingCycle === "monthly" ? "per month" : "per year"} in {currency}
        </p>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearEstimate}
            className="w-full mt-4"
            data-testid="button-clear-estimate"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Estimate
          </Button>
        )}
      </div>
    </Card>
  );
});

/**
 * EstimateItem - Individual item in the sidebar
 * Memoized to prevent re-renders when other items change
 */
const EstimateItem = memo(function EstimateItem({
  item,
  price,
  currency,
  exchangeRates,
  onEdit,
  onRemove,
}: any) {
  return (
    <div className="flex items-start justify-between gap-2 pb-3 border-b">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.serviceName}</p>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold whitespace-nowrap">
          {formatCurrency(price, currency, exchangeRates)}
        </p>
        <button
          onClick={() => onEdit(item.id)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`button-edit-${item.id}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="text-destructive hover:text-destructive/80 transition-colors"
          data-testid={`button-remove-${item.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
