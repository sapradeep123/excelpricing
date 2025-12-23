import { createContext, useContext } from "react";
import type { EstimateContextType } from "@/types/calculator";

export const EstimateContext = createContext<EstimateContextType | null>(null);

export function useEstimate() {
  const ctx = useContext(EstimateContext);
  if (!ctx) throw new Error("useEstimate must be used within EstimateProvider");
  return ctx;
}
