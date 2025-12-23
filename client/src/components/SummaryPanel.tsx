import { motion, AnimatePresence } from "framer-motion";
import { Printer, Calculator, ArrowRight, Sparkles } from "lucide-react";
import type { Product } from "@shared/schema";

interface SummaryPanelProps {
  items: { product: Product; quantity: number }[];
}

export function SummaryPanel({ items }: SummaryPanelProps) {
  // Calculate totals
  const monthlyTotal = items.reduce((sum, { product, quantity }) => {
    if (product.unit.toLowerCase().includes('month')) {
      return sum + (Number(product.price) * quantity);
    }
    return sum;
  }, 0);

  const oneTimeTotal = items.reduce((sum, { product, quantity }) => {
    if (!product.unit.toLowerCase().includes('month')) {
      return sum + (Number(product.price) * quantity);
    }
    return sum;
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border/50 overflow-hidden sticky top-8">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Calculator className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
        </div>
        <h2 className="text-2xl font-bold relative z-10 font-display">Estimate Summary</h2>
        <p className="text-slate-300 text-sm mt-1 relative z-10">
          Review your selected services
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
          <AnimatePresence initial={false}>
            {items.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-secondary/20"
              >
                <p>No items selected</p>
                <p className="text-xs mt-1">Add products to see the breakdown</p>
              </motion.div>
            ) : (
              items.map(({ product, quantity }) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-between items-center text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary font-mono font-bold w-6 h-6 rounded flex items-center justify-center text-xs">
                      {quantity}
                    </span>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {product.name}
                    </span>
                  </div>
                  <span className="text-muted-foreground font-mono">
                    ₹{(Number(product.price) * quantity).toLocaleString('en-IN')}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Totals */}
        <div className="space-y-3">
          <div className="flex justify-between items-end p-4 bg-secondary/30 rounded-xl border border-secondary">
            <span className="text-muted-foreground font-medium">Monthly Recurring</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground block leading-none">
                ₹{monthlyTotal.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-muted-foreground">per month</span>
            </div>
          </div>

          <div className="flex justify-between items-end p-4 bg-secondary/30 rounded-xl border border-secondary">
            <span className="text-muted-foreground font-medium">One-Time Costs</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground block leading-none">
                ₹{oneTimeTotal.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-muted-foreground">billed once</span>
            </div>
          </div>
        </div>

        {/* Total Grand */}
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Estimated First Month</span>
          </div>
          <div className="text-3xl font-bold text-primary">
            ₹{(monthlyTotal + oneTimeTotal).toLocaleString('en-IN')}
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-blue-600 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print / Save Quote
        </button>
      </div>
    </div>
  );
}
