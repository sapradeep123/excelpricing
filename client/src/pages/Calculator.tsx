import { useState, useMemo, createContext, useContext, useEffect } from "react";
import { useProducts } from "@/hooks/use-products";
import { useExchangeRates, formatCurrency, CURRENCY_OPTIONS } from "@/hooks/use-currency";
import type { Product, BillingCycle, Currency, ExchangeRates } from "@shared/schema";
import { getPrice, getBillingLabel } from "@/components/ServiceSelector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Loader2, AlertCircle, ChevronRight, ChevronLeft, Check, MapPin, Monitor, Cpu, 
  HardDrive, Network, Package, Search, Plus, Trash2, Server, Database, Shield, 
  Layers, Info, ArrowLeft, Share2, Copy, CheckCircle2, Pencil
} from "lucide-react";
import webberstopLogo from "@assets/webberstop-logo.png";

type ServiceType = "vm" | "object-storage" | "kubernetes" | "veeam" | null;
type ViewMode = "landing" | "catalog" | "configure" | "review";

const TECH_TOOLTIPS: Record<string, string> = {
  "vCPU": "Virtual CPU - A portion of a physical CPU core assigned to your virtual machine",
  "RAM": "Random Access Memory - Temporary storage for running applications. More RAM = better multitasking",
  "IOPS": "Input/Output Operations Per Second - Measures storage speed. Higher IOPS = faster disk performance",
  "HA": "High Availability - Redundant setup that keeps your services running if one server fails",
  "VPC": "Virtual Private Cloud - Your own isolated private network in the cloud",
  "Elastic IP": "A static public IP address that stays the same even if you restart your server",
  "Load Balancer": "Distributes traffic across multiple servers to improve performance and reliability",
  "Block Storage": "High-performance disk storage that can be attached to virtual machines",
  "Object Storage": "Scalable storage for files, images, and backups accessible via API",
  "Worker Node": "A server in your Kubernetes cluster that runs your applications",
  "Retention": "How long backup copies are kept before being automatically deleted",
};

function TechTerm({ term, children }: { term: keyof typeof TECH_TOOLTIPS; children?: React.ReactNode }) {
  const tooltip = TECH_TOOLTIPS[term];
  if (!tooltip) return <span>{children || term}</span>;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted decoration-muted-foreground/50 cursor-help">
          {children || term}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface CartItem {
  id: string;
  serviceType: ServiceType;
  serviceName: string;
  config: Record<string, any>;
  hourlyPrice: number;
  monthlyPrice: number;
  description: string;
}

interface EstimateContextType {
  items: CartItem[];
  billingCycle: BillingCycle;
  currency: Currency;
  exchangeRates?: ExchangeRates;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearEstimate: () => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  setCurrency: (currency: Currency) => void;
  editItem: (id: string) => void;
}

const EstimateContext = createContext<EstimateContextType | null>(null);

function useEstimate() {
  const ctx = useContext(EstimateContext);
  if (!ctx) throw new Error("useEstimate must be used within EstimateProvider");
  return ctx;
}

const SERVICE_CATALOG = [
  {
    id: "vm",
    name: "Virtual Machine",
    description: "Deploy scalable virtual machines with flexible compute, storage, and networking options.",
    icon: Server,
  },
  {
    id: "object-storage",
    name: "Object Storage",
    description: "S3-compatible object storage for files, backups, and static assets.",
    icon: Database,
  },
  {
    id: "kubernetes",
    name: "Kubernetes Cluster",
    description: "Managed Kubernetes clusters with autoscaling worker nodes and high availability.",
    icon: Layers,
  },
  {
    id: "veeam",
    name: "Veeam Backup",
    description: "Enterprise backup and disaster recovery solution for your infrastructure.",
    icon: Shield,
  },
];

export default function Calculator() {
  const [view, setView] = useState<ViewMode>("landing");
  const [activeService, setActiveService] = useState<ServiceType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  
  const { data: allProducts = [], isLoading, error } = useProducts();
  const { data: exchangeRates } = useExchangeRates();

  // Load quote from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("quote");
    if (quoteId) {
      fetch(`/api/quotes/${quoteId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((quote) => {
          if (quote) {
            setItems(quote.items as CartItem[]);
            setBillingCycle(quote.billingCycle as BillingCycle);
            setCurrency(quote.currency as Currency);
            setView("review");
            // Clean URL
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .catch(console.error);
    }
  }, []);

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    allProducts.forEach((p) => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  }, [allProducts]);

  const addItem = (item: Omit<CartItem, "id">) => {
    const newItem: CartItem = { ...item, id: `${item.serviceType}-${Date.now()}` };
    // Replace existing item of same service type (only 1 of each allowed)
    setItems((prev) => {
      const filtered = prev.filter((existing) => existing.serviceType !== item.serviceType);
      return [...filtered, newItem];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearEstimate = () => {
    setItems([]);
  };

  const editItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setActiveService(item.serviceType);
      setView("configure");
    }
  };

  const handleConfigureService = (serviceId: string) => {
    setActiveService(serviceId as ServiceType);
    setView("configure");
  };

  const handleBackToCatalog = () => {
    setActiveService(null);
    setView("catalog");
  };

  const handleAddToEstimate = (item: Omit<CartItem, "id">) => {
    addItem(item);
    setActiveService(null);
    setView("catalog");
  };

  const filteredServices = SERVICE_CATALOG.filter(
    (s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (billingCycle === "hourly") return sum + item.hourlyPrice;
      if (billingCycle === "yearly") return sum + (item.monthlyPrice * 12 * 0.9);
      return sum + item.monthlyPrice;
    }, 0);
  }, [items, billingCycle]);

  const estimateContext: EstimateContextType = {
    items,
    billingCycle,
    currency,
    exchangeRates,
    addItem,
    removeItem,
    clearEstimate,
    setBillingCycle,
    setCurrency,
    editItem,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-destructive/5 border border-destructive/20 rounded-md p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Unable to load calculator</h2>
          <p className="text-muted-foreground mb-6">Please try again later.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <EstimateContext.Provider value={estimateContext}>
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground py-3 px-4 sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col items-start gap-0.5">
              <img src={webberstopLogo} alt="WebberStop" className="h-7 w-auto" data-testid="img-logo" />
              <span className="font-semibold text-sm hidden sm:inline">Pricing Calculator</span>
            </div>
            <div className="flex items-center gap-4">
              {view !== "landing" && (
                <nav className="text-sm text-primary-foreground/80">
                  <button onClick={() => setView("landing")} className="hover:text-primary-foreground">
                    Home
                  </button>
                  <span className="mx-2">/</span>
                  <button onClick={() => setView("catalog")} className="hover:text-primary-foreground">
                    My Estimate
                  </button>
                  {view === "configure" && activeService && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="capitalize">{activeService.replace("-", " ")}</span>
                    </>
                  )}
                </nav>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {view === "landing" && (
            <LandingPage onCreateEstimate={() => setView("catalog")} />
          )}

          {view === "catalog" && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">Add Service</h1>
                    <p className="text-muted-foreground">Select a service to configure</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setView("review")} disabled={items.length === 0}>
                    View Estimate ({items.length})
                  </Button>
                </div>

                <Card className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-1.5 block">Choose a Region</label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger data-testid="select-catalog-region">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {(productsByCategory.region || []).map((r) => (
                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-1.5 block">Find Service</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search for a service..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-services"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  {filteredServices.map((service) => (
                    <Card key={service.id} className="p-6 flex flex-col">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <service.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 border-t flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">Configure pricing</span>
                        <Button size="sm" onClick={() => handleConfigureService(service.id)} data-testid={`button-configure-${service.id}`}>
                          Configure
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <EstimateSidebar />
              </div>
            </div>
          )}

          {view === "configure" && activeService && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Button variant="ghost" size="sm" onClick={handleBackToCatalog} className="mb-4" data-testid="button-back-catalog">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to services
                </Button>

                {activeService === "vm" && (
                  <VmConfigurator 
                    products={productsByCategory}
                    selectedRegion={selectedRegion}
                    onComplete={handleAddToEstimate}
                    onCancel={handleBackToCatalog}
                  />
                )}
                {activeService === "object-storage" && (
                  <ObjectStorageConfigurator
                    products={productsByCategory["object-storage"] || []}
                    onComplete={handleAddToEstimate}
                    onCancel={handleBackToCatalog}
                  />
                )}
                {activeService === "kubernetes" && (
                  <KubernetesConfigurator
                    products={productsByCategory}
                    selectedRegion={selectedRegion}
                    onComplete={handleAddToEstimate}
                    onCancel={handleBackToCatalog}
                  />
                )}
                {activeService === "veeam" && (
                  <VeeamConfigurator
                    products={productsByCategory["veeam"] || []}
                    onComplete={handleAddToEstimate}
                    onCancel={handleBackToCatalog}
                  />
                )}
              </div>

              <div className="lg:col-span-1">
                <EstimateSidebar />
              </div>
            </div>
          )}

          {view === "review" && (
            <ReviewPage onBack={() => setView("catalog")} onAddMore={() => setView("catalog")} />
          )}
        </main>
      </div>
    </EstimateContext.Provider>
  );
}

function LandingPage({ onCreateEstimate }: { onCreateEstimate: () => void }) {
  return (
    <div className="max-w-4xl mx-auto text-center py-16 space-y-8">
      <div className="space-y-4">
        <img src={webberstopLogo} alt="WebberStop" className="h-16 mx-auto" />
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Pricing Calculator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Estimate the cost for your cloud infrastructure. Configure services and get real-time pricing.
        </p>
      </div>

      <Card className="p-8 max-w-md mx-auto bg-secondary/30">
        <h2 className="text-xl font-semibold mb-4">Create an estimate</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Start your estimate with no commitment. Configure cloud services and see pricing for your needs.
        </p>
        <Button size="lg" onClick={onCreateEstimate} className="w-full" data-testid="button-create-estimate">
          Create Estimate
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>

      <div className="grid md:grid-cols-3 gap-6 pt-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold">Find Services</h3>
          <p className="text-sm text-muted-foreground">Browse and search our cloud service catalog</p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold">Configure</h3>
          <p className="text-sm text-muted-foreground">Customize each service to match your needs</p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Share2 className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold">Share</h3>
          <p className="text-sm text-muted-foreground">Generate a shareable link for your estimate</p>
        </div>
      </div>
    </div>
  );
}

function EstimateSidebar() {
  const { items, billingCycle, currency, exchangeRates, removeItem, clearEstimate, setBillingCycle, setCurrency, editItem } = useEstimate();
  
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (billingCycle === "hourly") return sum + item.hourlyPrice;
      if (billingCycle === "yearly") return sum + (item.monthlyPrice * 12 * 0.9);
      return sum + item.monthlyPrice;
    }, 0);
  }, [items, billingCycle]);

  const billingOptions: { value: BillingCycle; label: string }[] = [
    { value: "hourly", label: "Hourly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <Card className="p-6 bg-secondary/30 sticky top-20">
      <h2 className="text-lg font-semibold mb-4">My Estimate</h2>

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
          {billingOptions.map((option) => (
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
              <div key={item.id} className="flex items-start justify-between gap-2 pb-3 border-b">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.serviceName}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(price, currency, exchangeRates)}
                  </p>
                  <button
                    onClick={() => editItem(item.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-edit-${item.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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
          <Button variant="outline" size="sm" onClick={clearEstimate} className="w-full mt-4" data-testid="button-clear-estimate">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Estimate
          </Button>
        )}
      </div>
    </Card>
  );
}

interface ConfiguratorProps {
  products: Record<string, Product[]>;
  selectedRegion: string;
  onComplete: (item: Omit<CartItem, "id">) => void;
  onCancel: () => void;
}

interface SimpleConfiguratorProps {
  products: Product[];
  onComplete: (item: Omit<CartItem, "id">) => void;
  onCancel: () => void;
}

function VmConfigurator({ products, selectedRegion, onComplete, onCancel }: ConfiguratorProps) {
  const { billingCycle, currency, exchangeRates } = useEstimate();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    os: null as Product | null,
    compute: null as Product | null,
    storage: null as Product | null,
    vpc: null as Product | null,
    elasticIp: null as Product | null,
    loadBalancer: null as Product | null,
    addons: [] as Product[],
  });
  const [computeType, setComputeType] = useState("");
  
  const isWindowsOS = config.os?.subcategory === "Windows";

  const steps = ["Operating System", "Compute Plan", "Block Storage", "Networking", "Addons", "Review"];
  
  const computeSubcats = useMemo(() => {
    const subs = new Set<string>();
    (products.compute || []).forEach((p) => {
      if (p.subcategory) subs.add(p.subcategory);
    });
    return Array.from(subs);
  }, [products]);

  const filteredCompute = useMemo(() => {
    return (products.compute || []).filter((p) => p.subcategory === computeType);
  }, [products, computeType]);

  const canProceed = () => {
    if (step === 0) return config.os !== null;
    if (step === 1) return config.compute !== null;
    if (step === 2) return config.storage !== null;
    return true;
  };

  const totalMonthly = useMemo(() => {
    let sum = 0;
    if (config.os) sum += Number(config.os.priceMonthly);
    if (config.compute) sum += Number(config.compute.priceMonthly);
    if (config.storage) sum += Number(config.storage.priceMonthly);
    if (config.vpc) sum += Number(config.vpc.priceMonthly);
    if (config.elasticIp) sum += Number(config.elasticIp.priceMonthly);
    if (config.loadBalancer) sum += Number(config.loadBalancer.priceMonthly);
    config.addons.forEach((a) => sum += Number(a.priceMonthly));
    return sum;
  }, [config]);

  const totalHourly = useMemo(() => {
    let sum = 0;
    if (config.os) sum += Number(config.os.priceHourly);
    if (config.compute) sum += Number(config.compute.priceHourly);
    if (config.storage) sum += Number(config.storage.priceHourly);
    if (config.vpc) sum += Number(config.vpc.priceHourly);
    if (config.elasticIp) sum += Number(config.elasticIp.priceHourly);
    if (config.loadBalancer) sum += Number(config.loadBalancer.priceHourly);
    config.addons.forEach((a) => sum += Number(a.priceHourly));
    return sum;
  }, [config]);
  
  const vpcOptions = products["networking-vpc"] || [];
  const elasticIpOptions = products["networking-ip"] || [];
  const lbOptions = products["networking-lb"] || [];
  const generalAddons = products.addon || [];
  const windowsAddons = products["addon-windows"] || [];
  const availableAddons = isWindowsOS ? [...generalAddons, ...windowsAddons] : generalAddons;

  const handleComplete = () => {
    const networkingParts = [];
    if (config.vpc) networkingParts.push(config.vpc.name);
    if (config.elasticIp) networkingParts.push(config.elasticIp.name);
    if (config.loadBalancer) networkingParts.push(config.loadBalancer.name);
    
    const desc = `${selectedRegion || "Default Region"} | ${config.os?.name} | ${config.compute?.name} | ${config.storage?.name}${networkingParts.length > 0 ? ` | ${networkingParts.join(", ")}` : ""}`;
    onComplete({
      serviceType: "vm",
      serviceName: "Virtual Machine",
      config: { ...config, region: selectedRegion },
      hourlyPrice: totalHourly,
      monthlyPrice: totalMonthly,
      description: desc,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <SelectionGrid
            title="Select Operating System"
            items={products.os || []}
            selected={config.os}
            onSelect={(p) => setConfig((prev) => ({ ...prev, os: p }))}
            icon={Monitor}
            showPrice
          />
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold">Select Compute Plan</h3>
              <Select value={computeType} onValueChange={setComputeType}>
                <SelectTrigger className="w-[200px]" data-testid="select-compute-type">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {computeSubcats.map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {computeType ? (
              <SelectionGrid
                items={filteredCompute}
                selected={config.compute}
                onSelect={(p) => setConfig((prev) => ({ ...prev, compute: p }))}
                icon={Cpu}
                showPrice
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Please select a category to view compute plans
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <SelectionGrid
            title={<>Select <TechTerm term="Block Storage">Block Storage</TechTerm></>}
            items={products.storage || []}
            selected={config.storage}
            onSelect={(p) => setConfig((prev) => ({ ...prev, storage: p }))}
            icon={HardDrive}
            showPrice
          />
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Configure Networking (Optional)</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" />
                  <TechTerm term="VPC">Virtual Private Cloud (VPC)</TechTerm>
                </h4>
                <SelectionGrid
                  items={vpcOptions}
                  selected={config.vpc}
                  onSelect={(p) => setConfig((prev) => ({ ...prev, vpc: prev.vpc?.id === p.id ? null : p }))}
                  icon={Network}
                  showPrice
                  allowDeselect
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <TechTerm term="Elastic IP">Elastic IP Address</TechTerm>
                </h4>
                <SelectionGrid
                  items={elasticIpOptions}
                  selected={config.elasticIp}
                  onSelect={(p) => setConfig((prev) => ({ ...prev, elasticIp: prev.elasticIp?.id === p.id ? null : p }))}
                  icon={MapPin}
                  showPrice
                  allowDeselect
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <TechTerm term="Load Balancer">Load Balancer</TechTerm> (Optional)
                </h4>
                <SelectionGrid
                  items={lbOptions}
                  selected={config.loadBalancer}
                  onSelect={(p) => setConfig((prev) => ({ ...prev, loadBalancer: prev.loadBalancer?.id === p.id ? null : p }))}
                  icon={Layers}
                  showPrice
                  allowDeselect
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <MultiSelectGrid
              title={`Select Addons (Optional)${isWindowsOS ? " - Windows security options available" : ""}`}
              items={availableAddons}
              selected={config.addons}
              onToggle={(p) => {
                setConfig((prev) => {
                  const exists = prev.addons.some((a) => a.id === p.id);
                  return {
                    ...prev,
                    addons: exists 
                      ? prev.addons.filter((a) => a.id !== p.id)
                      : [...prev.addons, p],
                  };
                });
              }}
              icon={Package}
            />
            {isWindowsOS && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Windows-specific security options like Antivirus are now available for your Windows VM.
                </p>
              </div>
            )}
          </div>
        );
      case 5: {
        const networkingTotal = (config.vpc ? Number(config.vpc.priceMonthly) : 0) + 
                               (config.elasticIp ? Number(config.elasticIp.priceMonthly) : 0) + 
                               (config.loadBalancer ? Number(config.loadBalancer.priceMonthly) : 0);
        const networkingNames = [
          config.vpc?.name,
          config.elasticIp?.name,
          config.loadBalancer?.name,
        ].filter(Boolean).join(", ");
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review VM Configuration</h3>
            <div className="space-y-3">
              <ReviewRow label="Region" value={selectedRegion || "Default Region"} />
              <ReviewRow label="Operating System" value={config.os?.name} price={config.os ? Number(config.os.priceMonthly) : 0} />
              <ReviewRow label="Compute Plan" value={config.compute?.name} desc={config.compute?.description} price={config.compute ? Number(config.compute.priceMonthly) : 0} />
              <ReviewRow label="Block Storage" value={config.storage?.name} price={config.storage ? Number(config.storage.priceMonthly) : 0} />
              {networkingNames && (
                <ReviewRow label="Networking" value={networkingNames} price={networkingTotal} />
              )}
              {config.addons.length > 0 && (
                <ReviewRow label="Addons" value={config.addons.map((a) => a.name).join(", ")} price={config.addons.reduce((s, a) => s + Number(a.priceMonthly), 0)} />
              )}
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-md p-4 mt-6">
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthly, currency, exchangeRates)}</p>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          Configure Virtual Machine
        </h2>
        <p className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}: {steps[step]}</p>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
              i === step ? "bg-primary text-primary-foreground" :
              i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {renderStep()}

      <div className="flex justify-between mt-8 pt-6 border-t gap-4">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(step - 1)} data-testid="button-prev">
          <ChevronLeft className="w-4 h-4 mr-2" />
          {step === 0 ? "Cancel" : "Previous"}
        </Button>
        {step === steps.length - 1 ? (
          <Button onClick={handleComplete} data-testid="button-add-to-estimate">
            <Plus className="w-4 h-4 mr-2" />
            Add to Estimate
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} data-testid="button-next">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function ObjectStorageConfigurator({ products, onComplete, onCancel }: SimpleConfiguratorProps) {
  const { currency, exchangeRates } = useEstimate();
  const [selected, setSelected] = useState<Product | null>(null);

  const handleComplete = () => {
    if (!selected) return;
    onComplete({
      serviceType: "object-storage",
      serviceName: "Object Storage",
      config: { package: selected },
      hourlyPrice: Number(selected.priceHourly),
      monthlyPrice: Number(selected.priceMonthly),
      description: selected.name,
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Configure Object Storage
        </h2>
        <p className="text-sm text-muted-foreground">Select a storage package</p>
      </div>

      <SelectionGrid
        title="Select Package"
        items={products}
        selected={selected}
        onSelect={setSelected}
        icon={Database}
        showPrice
      />

      <div className="flex justify-between mt-8 pt-6 border-t gap-4">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleComplete} disabled={!selected} data-testid="button-add-to-estimate">
          <Plus className="w-4 h-4 mr-2" />
          Add to Estimate
        </Button>
      </div>
    </Card>
  );
}

function KubernetesConfigurator({ products, selectedRegion, onComplete, onCancel }: ConfiguratorProps) {
  const { currency, exchangeRates } = useEstimate();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    version: null as Product | null,
    compute: null as Product | null,
    workers: 3,
    storage: null as Product | null,
    ha: false,
  });

  const steps = ["Version", "Compute Plan", "Worker Nodes", "Block Storage", "High Availability", "Review"];
  
  const haProduct = (products["k8s-ha"] || [])[0];

  const canProceed = () => {
    if (step === 0) return config.version !== null;
    if (step === 1) return config.compute !== null;
    if (step === 2) return config.workers >= 1;
    if (step === 3) return config.storage !== null;
    return true;
  };

  const totalMonthly = useMemo(() => {
    let sum = 0;
    if (config.compute) sum += Number(config.compute.priceMonthly) * config.workers;
    if (config.storage) sum += Number(config.storage.priceMonthly) * config.workers;
    if (config.ha && haProduct) sum += Number(haProduct.priceMonthly);
    return sum;
  }, [config, haProduct]);

  const totalHourly = useMemo(() => {
    let sum = 0;
    if (config.compute) sum += Number(config.compute.priceHourly) * config.workers;
    if (config.storage) sum += Number(config.storage.priceHourly) * config.workers;
    if (config.ha && haProduct) sum += Number(haProduct.priceHourly);
    return sum;
  }, [config, haProduct]);

  const handleComplete = () => {
    const desc = `${selectedRegion || "Default Region"} | ${config.version?.name} | ${config.workers} workers | ${config.compute?.name}`;
    onComplete({
      serviceType: "kubernetes",
      serviceName: "Kubernetes Cluster",
      config: { ...config, region: selectedRegion },
      hourlyPrice: totalHourly,
      monthlyPrice: totalMonthly,
      description: desc,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <SelectionGrid
            title="Select Kubernetes Version"
            items={products["k8s-version"] || []}
            selected={config.version}
            onSelect={(p) => setConfig((prev) => ({ ...prev, version: p }))}
            icon={Layers}
          />
        );
      case 1:
        return (
          <SelectionGrid
            title="Select Compute Plan (per worker)"
            items={products["k8s-compute"] || []}
            selected={config.compute}
            onSelect={(p) => setConfig((prev) => ({ ...prev, compute: p }))}
            icon={Cpu}
            showPrice
          />
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Number of <TechTerm term="Worker Node">Worker Nodes</TechTerm></h3>
            <p className="text-sm text-muted-foreground">Select how many worker nodes for your cluster (minimum 1)</p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setConfig((prev) => ({ ...prev, workers: Math.max(1, prev.workers - 1) }))}
                disabled={config.workers <= 1}
              >
                -
              </Button>
              <span className="text-3xl font-bold w-16 text-center">{config.workers}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setConfig((prev) => ({ ...prev, workers: prev.workers + 1 }))}
              >
                +
              </Button>
            </div>
            {config.compute && (
              <p className="text-sm text-muted-foreground">
                {config.workers} x {config.compute.name} = {formatCurrency(Number(config.compute.priceMonthly) * config.workers, currency, exchangeRates)}/mo
              </p>
            )}
          </div>
        );
      case 3:
        return (
          <SelectionGrid
            title="Select Block Storage (per worker)"
            items={products.storage || []}
            selected={config.storage}
            onSelect={(p) => setConfig((prev) => ({ ...prev, storage: p }))}
            icon={HardDrive}
            showPrice
          />
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold"><TechTerm term="HA">High Availability</TechTerm></h3>
            <p className="text-sm text-muted-foreground">Enable multi-master HA for production workloads. This ensures your cluster stays running even if a master node fails.</p>
            {haProduct && (
              <Card
                className={`p-4 cursor-pointer transition-all ${config.ha ? "border-primary bg-primary/5" : ""}`}
                onClick={() => setConfig((prev) => ({ ...prev, ha: !prev.ha }))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={config.ha} />
                    <div>
                      <p className="font-semibold">{haProduct.name}</p>
                      <p className="text-sm text-muted-foreground">{haProduct.description}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    +{formatCurrency(Number(haProduct.priceMonthly), currency, exchangeRates)}/mo
                  </span>
                </div>
              </Card>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Kubernetes Configuration</h3>
            <div className="space-y-3">
              <ReviewRow label="Region" value={selectedRegion || "Default Region"} />
              <ReviewRow label="Kubernetes Version" value={config.version?.name} />
              <ReviewRow label="Worker Nodes" value={`${config.workers} x ${config.compute?.name}`} price={config.compute ? Number(config.compute.priceMonthly) * config.workers : 0} />
              <ReviewRow label="Storage per Node" value={`${config.workers} x ${config.storage?.name}`} price={config.storage ? Number(config.storage.priceMonthly) * config.workers : 0} />
              {config.ha && haProduct && (
                <ReviewRow label="High Availability" value="Enabled" price={Number(haProduct.priceMonthly)} />
              )}
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-md p-4 mt-6">
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthly, currency, exchangeRates)}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Configure Kubernetes Cluster
        </h2>
        <p className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}: {steps[step]}</p>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
              i === step ? "bg-primary text-primary-foreground" :
              i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {renderStep()}

      <div className="flex justify-between mt-8 pt-6 border-t gap-4">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(step - 1)} data-testid="button-prev">
          <ChevronLeft className="w-4 h-4 mr-2" />
          {step === 0 ? "Cancel" : "Previous"}
        </Button>
        {step === steps.length - 1 ? (
          <Button onClick={handleComplete} data-testid="button-add-to-estimate">
            <Plus className="w-4 h-4 mr-2" />
            Add to Estimate
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} data-testid="button-next">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function VeeamConfigurator({ products, onComplete, onCancel }: SimpleConfiguratorProps) {
  const { currency, exchangeRates, billingCycle } = useEstimate();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    capacity: null as Product | null,
    retention: "30" as string,
    frequency: "daily" as string,
  });

  const steps = ["Capacity Tier", "Retention & Frequency", "Review"];

  const retentionOptions = [
    { value: "7", label: "7 Days", multiplier: 0.7 },
    { value: "14", label: "14 Days", multiplier: 0.85 },
    { value: "30", label: "30 Days", multiplier: 1.0 },
    { value: "90", label: "90 Days", multiplier: 1.3 },
  ];

  const frequencyOptions = [
    { value: "daily", label: "Daily", multiplier: 1.0 },
    { value: "weekly", label: "Weekly", multiplier: 0.5 },
  ];

  const getRetentionMultiplier = () => retentionOptions.find(r => r.value === config.retention)?.multiplier || 1;
  const getFrequencyMultiplier = () => frequencyOptions.find(f => f.value === config.frequency)?.multiplier || 1;

  const totalMonthly = useMemo(() => {
    if (!config.capacity) return 0;
    const base = Number(config.capacity.priceMonthly);
    return base * getRetentionMultiplier() * getFrequencyMultiplier();
  }, [config]);

  const totalHourly = useMemo(() => {
    if (!config.capacity) return 0;
    const base = Number(config.capacity.priceHourly);
    return base * getRetentionMultiplier() * getFrequencyMultiplier();
  }, [config]);

  const canProceed = () => {
    if (step === 0) return config.capacity !== null;
    return true;
  };

  const handleComplete = () => {
    if (!config.capacity) return;
    const retLabel = retentionOptions.find(r => r.value === config.retention)?.label || config.retention;
    const freqLabel = frequencyOptions.find(f => f.value === config.frequency)?.label || config.frequency;
    onComplete({
      serviceType: "veeam",
      serviceName: "Veeam Backup",
      config,
      hourlyPrice: totalHourly,
      monthlyPrice: totalMonthly,
      description: `${config.capacity.name} | ${retLabel} retention | ${freqLabel} backup`,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <SelectionGrid
            title="Select Capacity Tier"
            items={products}
            selected={config.capacity}
            onSelect={(p) => setConfig((prev) => ({ ...prev, capacity: p }))}
            icon={Shield}
            showPrice
          />
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Retention Period</h3>
              <p className="text-sm text-muted-foreground mb-4">How long to keep backup copies</p>
              <div className="grid grid-cols-2 gap-3">
                {retentionOptions.map((opt) => (
                  <Card
                    key={opt.value}
                    className={`p-4 cursor-pointer transition-all ${
                      config.retention === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setConfig((prev) => ({ ...prev, retention: opt.value }))}
                    data-testid={`card-retention-${opt.value}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{opt.label}</span>
                      {config.retention === opt.value && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    {opt.multiplier !== 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {opt.multiplier < 1 ? `${Math.round((1 - opt.multiplier) * 100)}% discount` : `+${Math.round((opt.multiplier - 1) * 100)}%`}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Backup Frequency</h3>
              <p className="text-sm text-muted-foreground mb-4">How often to run backups</p>
              <div className="grid grid-cols-2 gap-3">
                {frequencyOptions.map((opt) => (
                  <Card
                    key={opt.value}
                    className={`p-4 cursor-pointer transition-all ${
                      config.frequency === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setConfig((prev) => ({ ...prev, frequency: opt.value }))}
                    data-testid={`card-frequency-${opt.value}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{opt.label}</span>
                      {config.frequency === opt.value && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    {opt.multiplier !== 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {opt.multiplier < 1 ? `${Math.round((1 - opt.multiplier) * 100)}% discount` : ""}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Veeam Configuration</h3>
            <div className="space-y-3">
              <ReviewRow label="Capacity Tier" value={config.capacity?.name} />
              <ReviewRow label="Retention" value={retentionOptions.find(r => r.value === config.retention)?.label} />
              <ReviewRow label="Frequency" value={frequencyOptions.find(f => f.value === config.frequency)?.label} />
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-md p-4 mt-6">
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthly, currency, exchangeRates)}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Configure Veeam Backup
        </h2>
        <div className="flex gap-2 mt-4">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-2 text-sm ${i <= step ? "text-primary" : "text-muted-foreground"}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/20 text-primary border border-primary" : "bg-muted"
              }`}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="hidden sm:inline">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {renderStep()}

      <div className="flex justify-between mt-8 pt-6 border-t gap-4">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(step - 1)} data-testid="button-prev">
          <ChevronLeft className="w-4 h-4 mr-2" />
          {step === 0 ? "Cancel" : "Previous"}
        </Button>
        {step === steps.length - 1 ? (
          <Button onClick={handleComplete} data-testid="button-add-to-estimate">
            <Plus className="w-4 h-4 mr-2" />
            Add to Estimate
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} data-testid="button-next">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function SelectionGrid({ 
  title, 
  items, 
  selected, 
  onSelect, 
  icon: Icon,
  showPrice = false,
  allowDeselect = false
}: { 
  title?: React.ReactNode;
  items: Product[];
  selected: Product | null;
  onSelect: (p: Product) => void;
  icon: any;
  showPrice?: boolean;
  allowDeselect?: boolean;
}) {
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
}

function MultiSelectGrid({ 
  title, 
  items, 
  selected, 
  onToggle, 
  icon: Icon 
}: { 
  title: string;
  items: Product[];
  selected: Product[];
  onToggle: (p: Product) => void;
  icon: any;
}) {
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
}

function ReviewRow({ label, value, desc, price }: { label: string; value?: string; desc?: string; price?: number }) {
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
}

function ReviewPage({ onBack, onAddMore }: { onBack: () => void; onAddMore: () => void }) {
  const { items, billingCycle, currency, exchangeRates, clearEstimate } = useEstimate();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (billingCycle === "hourly") return sum + item.hourlyPrice;
      if (billingCycle === "yearly") return sum + (item.monthlyPrice * 12 * 0.9);
      return sum + item.monthlyPrice;
    }, 0);
  }, [items, billingCycle]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, billingCycle, currency }),
      });
      if (!response.ok) throw new Error("Failed to create quote");
      const data = await response.json();
      const url = `${window.location.origin}/?quote=${data.id}`;
      setShareUrl(url);
    } catch (error) {
      console.error("Error creating shareable link:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Estimate</h1>
          <p className="text-muted-foreground">{items.length} service(s) configured</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAddMore}>
            <Plus className="w-4 h-4 mr-2" />
            Add More Services
          </Button>
          <Button onClick={handleShare} disabled={isSharing || items.length === 0}>
            {isSharing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            Get Shareable Link
          </Button>
        </div>
      </div>

      {shareUrl && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Shareable Link (valid for 30 days)</p>
              <p className="text-sm text-muted-foreground truncate">{shareUrl}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copyToClipboard} data-testid="button-copy-link">
              {copied ? (
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No services in your estimate</p>
          <Button onClick={onAddMore}>Add Services</Button>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-semibold">Service</th>
                  <th className="text-left py-3 font-semibold">Configuration</th>
                  <th className="text-right py-3 font-semibold">
                    {billingCycle === "hourly" ? "Hourly" : billingCycle === "monthly" ? "Monthly" : "Yearly"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  let price = item.monthlyPrice;
                  if (billingCycle === "hourly") price = item.hourlyPrice;
                  if (billingCycle === "yearly") price = item.monthlyPrice * 12 * 0.9;
                  
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="py-4">
                        <p className="font-medium">{item.serviceName}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </td>
                      <td className="py-4 text-right font-medium">
                        {formatCurrency(price, currency, exchangeRates)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="py-4 font-bold text-lg">Total</td>
                  <td className="py-4 text-right font-bold text-2xl text-primary">
                    {formatCurrency(total, currency, exchangeRates)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <p className="text-sm text-muted-foreground text-center">
            Prices are estimates and may vary. Valid for 30 days.
          </p>
        </>
      )}

      <div className="print:block hidden p-8">
        <div className="flex items-center gap-4 mb-8">
          <img src={webberstopLogo} alt="WebberStop" className="h-10" />
          <div>
            <h1 className="text-2xl font-bold">Cloud Infrastructure Estimate</h1>
            <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
