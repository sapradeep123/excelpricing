import { motion } from "framer-motion";
import { Plus, Minus, Check } from "lucide-react";
import type { Product } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  quantity: number;
  onUpdateQuantity: (quantity: number) => void;
}

export function ProductCard({ product, quantity, onUpdateQuantity }: ProductCardProps) {
  const isSelected = quantity > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative flex flex-col p-6 rounded-2xl transition-all duration-300 border-2",
        isSelected 
          ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" 
          : "bg-white border-border hover:border-primary/50 hover:shadow-xl hover:shadow-black/5"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground mb-2 capitalize">
            {product.category}
          </span>
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </div>
        {isSelected && (
          <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-sm mb-6 flex-grow leading-relaxed">
        {product.description}
      </p>

      <div className="mt-auto space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>
          <span className="text-muted-foreground text-sm font-medium">
            / {product.unit}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdateQuantity(Math.max(0, quantity - 1))}
            className="p-2 rounded-lg border border-input bg-background hover:bg-secondary hover:border-secondary-foreground/20 text-foreground transition-all active:scale-95 disabled:opacity-50"
            disabled={quantity === 0}
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="flex-1 text-center font-mono font-semibold text-lg bg-secondary/50 py-1.5 rounded-lg border border-transparent group-hover:border-input/50 transition-colors">
            {quantity}
          </div>

          <button
            onClick={() => onUpdateQuantity(quantity + 1)}
            className="p-2 rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 active:translate-y-0"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
