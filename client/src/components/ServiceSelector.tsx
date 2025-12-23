import { useState, useMemo } from "react";
import type { Product, BillingCycle, Currency, ExchangeRates } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Minus, X, Info } from "lucide-react";
import { formatCurrency } from "@/hooks/use-currency";

interface SelectedService extends Product {
  quantity: number;
}

interface ServiceSelectorProps {
  services: Product[];
  selectedServices: SelectedService[];
  onSelectService: (service: Product, quantity: number) => void;
  onRemoveService: (serviceId: number) => void;
  billingCycle: BillingCycle;
  currency: Currency;
  exchangeRates?: ExchangeRates;
}

export function getPrice(product: Product, cycle: BillingCycle): number {
  switch (cycle) {
    case "hourly":
      return Number(product.priceHourly);
    case "monthly":
      return Number(product.priceMonthly);
    case "yearly":
      return Number(product.priceYearly);
  }
}

export function getBillingLabel(cycle: BillingCycle): string {
  switch (cycle) {
    case "hourly":
      return "/hr";
    case "monthly":
      return "/mo";
    case "yearly":
      return "/yr";
  }
}

export function ServiceSelector({
  services,
  selectedServices,
  onSelectService,
  onRemoveService,
  billingCycle,
  currency,
  exchangeRates,
}: ServiceSelectorProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");

  const subcategories = useMemo(() => {
    const subs = new Set<string>();
    services.forEach((s) => {
      if (s.subcategory) {
        subs.add(s.subcategory);
      }
    });
    return Array.from(subs);
  }, [services]);

  const filteredServices = useMemo(() => {
    if (selectedSubcategory === "all" || subcategories.length <= 1) {
      return services;
    }
    return services.filter((s) => s.subcategory === selectedSubcategory);
  }, [services, selectedSubcategory, subcategories]);

  const getQuantity = (serviceId: number) => {
    return (
      selectedServices.find((s) => s.id === serviceId)?.quantity ||
      quantities[serviceId] ||
      1
    );
  };

  const handleAddService = (service: Product) => {
    const quantity = getQuantity(service.id);
    onSelectService(service, quantity);
    setQuantities((prev) => ({ ...prev, [service.id]: 1 }));
  };

  const handleQuantityChange = (serviceId: number, delta: number) => {
    const current = getQuantity(serviceId);
    const newQuantity = Math.max(1, current + delta);
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      onSelectService(service, newQuantity);
      setQuantities((prev) => ({ ...prev, [serviceId]: newQuantity }));
    }
  };

  return (
    <div className="space-y-4">
      {subcategories.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Plan Type:</span>
          <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
            <SelectTrigger className="w-[200px]" data-testid="select-subcategory">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              {subcategories.map((sub) => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter plans by type to find the best fit for your workload</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="grid gap-4">
        {filteredServices.map((service) => {
          const isSelected = selectedServices.some((s) => s.id === service.id);
          const quantity = getQuantity(service.id);
          const price = getPrice(service, billingCycle);

          return (
            <Card
              key={service.id}
              className={`p-4 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              data-testid={`card-service-${service.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {service.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className={`text-sm font-medium ${billingCycle === "hourly" ? "text-primary" : "text-muted-foreground"}`}>
                      {formatCurrency(Number(service.priceHourly), currency, exchangeRates)}/hr
                    </span>
                    <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-primary" : "text-muted-foreground"}`}>
                      {formatCurrency(Number(service.priceMonthly), currency, exchangeRates)}/mo
                    </span>
                    <span className={`text-sm font-medium ${billingCycle === "yearly" ? "text-primary" : "text-muted-foreground"}`}>
                      {formatCurrency(Number(service.priceYearly), currency, exchangeRates)}/yr
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleQuantityChange(service.id, -1)}
                      data-testid={`button-decrease-${service.id}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleQuantityChange(service.id, 1)}
                      data-testid={`button-increase-${service.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onRemoveService(service.id)}
                      data-testid={`button-remove-${service.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleAddService(service)}
                    variant="outline"
                    data-testid={`button-add-${service.id}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {services.length === 0 
            ? "No services available in this category."
            : "No plans match the selected filter."}
        </div>
      )}
    </div>
  );
}
