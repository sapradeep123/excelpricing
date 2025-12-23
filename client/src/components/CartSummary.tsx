import type { Product, BillingCycle, Currency, ExchangeRates } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Info, Download, FileText } from "lucide-react";
import { getPrice, getBillingLabel } from "./ServiceSelector";
import { formatCurrency, CURRENCY_OPTIONS, getCurrencySymbol, convertCurrency } from "@/hooks/use-currency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartSummaryProps {
  items: CartItem[];
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  exchangeRates?: ExchangeRates;
}

export function CartSummary({
  items,
  onRemoveItem,
  onClearCart,
  billingCycle,
  onBillingCycleChange,
  currency,
  onCurrencyChange,
  exchangeRates,
}: CartSummaryProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + getPrice(item.product, billingCycle) * item.quantity,
    0
  );
  
  const GST_RATE = 0.18;
  const isINR = currency === "INR";
  const gstAmount = isINR ? subtotal * GST_RATE : 0;
  const total = subtotal + gstAmount;

  const generatePDF = () => {
    const doc = new jsPDF();
    const symbol = getCurrencySymbol(currency);
    const now = new Date();
    const quoteId = `WS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    doc.setFillColor(80, 143, 255);
    doc.rect(0, 0, 220, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("WebberStop", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Cloud Services Price Estimate", 20, 33);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Quote ID: ${quoteId}`, 140, 55);
    doc.text(`Date: ${now.toLocaleDateString()}`, 140, 62);
    doc.text(`Valid Until: ${expiryDate.toLocaleDateString()}`, 140, 69);
    doc.text(`Billing: ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`, 140, 76);
    doc.text(`Currency: ${currency}`, 140, 83);

    const tableData = items.map((item) => {
      const unitPrice = convertCurrency(getPrice(item.product, billingCycle), currency, exchangeRates);
      const lineTotal = unitPrice * item.quantity;
      return [
        item.product.name,
        item.product.description || "-",
        item.quantity.toString(),
        `${symbol}${unitPrice.toFixed(2)}`,
        `${symbol}${lineTotal.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: 95,
      head: [["Service", "Description", "Qty", "Unit Price", "Total"]],
      body: tableData,
      headStyles: { fillColor: [80, 143, 255], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 60 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
      },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    const convertedSubtotal = convertCurrency(subtotal, currency, exchangeRates);
    const convertedGst = convertCurrency(gstAmount, currency, exchangeRates);
    const convertedTotal = convertCurrency(total, currency, exchangeRates);

    doc.setFontSize(10);
    doc.text("Subtotal:", 140, finalY);
    doc.text(`${symbol}${convertedSubtotal.toFixed(2)}`, 175, finalY, { align: "right" });

    if (isINR) {
      doc.text("GST (18%):", 140, finalY + 7);
      doc.text(`${symbol}${convertedGst.toFixed(2)}`, 175, finalY + 7, { align: "right" });
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const totalY = isINR ? finalY + 17 : finalY + 10;
    doc.text("Total:", 140, totalY);
    doc.setTextColor(80, 143, 255);
    doc.text(`${symbol}${convertedTotal.toFixed(2)}`, 175, totalY, { align: "right" });

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("WebberStop India Private Limited", 20, 270);
    doc.text("www.webhoststop.com | support@webhoststop.com", 20, 276);
    doc.text("This is an estimate only. Final pricing may vary based on actual usage.", 20, 282);

    doc.save(`WebberStop-Quote-${quoteId}.pdf`);
  };

  const billingOptions: { value: BillingCycle; label: string }[] = [
    { value: "hourly", label: "Hourly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <Card className="p-6 bg-secondary/30 sticky top-6">
      <h2 className="text-lg font-semibold mb-4">Estimate Summary</h2>

      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <label className="text-sm text-muted-foreground">Billing Cycle</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Choose how you want to be billed. Yearly plans include a 10% discount.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {billingOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onBillingCycleChange(option.value)}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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

      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <label className="text-sm text-muted-foreground">Currency</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Prices are converted using live exchange rates</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onCurrencyChange(option.value)}
              className={`flex-1 px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${
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

      <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No services selected yet
          </p>
        ) : (
          items.map((item) => {
            const price = getPrice(item.product, billingCycle);
            return (
              <div
                key={item.product.id}
                className="flex items-start justify-between gap-2 pb-3 border-b"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}x {formatCurrency(price, currency, exchangeRates)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(price * item.quantity, currency, exchangeRates)}
                  </p>
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="mt-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                    data-testid={`button-remove-from-summary-${item.product.id}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {items.length > 0 && (
        <>
          <div className="border-t pt-4 mb-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm font-medium text-foreground" data-testid="text-subtotal">
                {formatCurrency(subtotal, currency, exchangeRates)}
              </span>
            </div>
            
            {isINR && (
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground flex items-center gap-1 cursor-help">
                      GST (18%)
                      <Info className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Goods and Services Tax applicable for Indian customers</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm font-medium text-foreground" data-testid="text-gst">
                  {formatCurrency(gstAmount, currency, exchangeRates)}
                </span>
              </div>
            )}
            
            {!isINR && (
              <p className="text-xs text-muted-foreground italic">
                Tax calculated based on your location at checkout
              </p>
            )}
            
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-lg font-bold text-foreground">Total</span>
              <span
                className="text-2xl font-bold text-primary"
                data-testid="text-total-price"
              >
                {formatCurrency(total, currency, exchangeRates)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Prices in {currency} {getBillingLabel(billingCycle)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={generatePDF}
              data-testid="button-download-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onClearCart}
              data-testid="button-clear-cart"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
