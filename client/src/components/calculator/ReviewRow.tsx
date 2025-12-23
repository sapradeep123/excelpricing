import { memo } from "react";
import { useEstimate } from "@/contexts/EstimateContext";
import { formatCurrency } from "@/hooks/use-currency";

interface ReviewRowProps {
  label: string;
  value?: string;
  desc?: string;
  price?: number;
}

/**
 * ReviewRow displays a single configuration line in review step
 * Memoized to prevent re-renders when sibling rows change
 */
export const ReviewRow = memo(function ReviewRow({ label, value, desc, price }: ReviewRowProps) {
  const { currency, exchangeRates } = useEstimate();

  return (
    <div className="flex justify-between items-start py-2 border-b">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "Not selected"}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {price !== undefined && price > 0 && (
        <span className="font-medium text-primary whitespace-nowrap">
          {formatCurrency(price, currency, exchangeRates)}
        </span>
      )}
    </div>
  );
});
