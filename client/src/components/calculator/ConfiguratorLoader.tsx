import { Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ConfiguratorProps, SimpleConfiguratorProps } from "@/types/calculator";

/**
 * Lazy-loaded configurators for better performance
 * Components are loaded only when needed
 */
export const VmConfigurator = lazy(() =>
  import("./configurators/VmConfigurator").then((module) => ({
    default: module.VmConfigurator,
  }))
);

export const ObjectStorageConfigurator = lazy(() =>
  import("./configurators/ObjectStorageConfigurator").then((module) => ({
    default: module.ObjectStorageConfigurator,
  }))
);

export const KubernetesConfigurator = lazy(() =>
  import("./configurators/KubernetesConfigurator").then((module) => ({
    default: module.KubernetesConfigurator,
  }))
);

export const VeeamConfigurator = lazy(() =>
  import("./configurators/VeeamConfigurator").then((module) => ({
    default: module.VeeamConfigurator,
  }))
);

/**
 * Loading fallback component
 */
function ConfiguratorLoading() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading configurator...</p>
      </div>
    </Card>
  );
}

/**
 * Wrapper components with Suspense
 */
export function VmConfiguratorWithSuspense(props: ConfiguratorProps) {
  return (
    <Suspense fallback={<ConfiguratorLoading />}>
      <VmConfigurator {...props} />
    </Suspense>
  );
}

export function ObjectStorageConfiguratorWithSuspense(props: SimpleConfiguratorProps) {
  return (
    <Suspense fallback={<ConfiguratorLoading />}>
      <ObjectStorageConfigurator {...props} />
    </Suspense>
  );
}

export function KubernetesConfiguratorWithSuspense(props: ConfiguratorProps) {
  return (
    <Suspense fallback={<ConfiguratorLoading />}>
      <KubernetesConfigurator {...props} />
    </Suspense>
  );
}

export function VeeamConfiguratorWithSuspense(props: SimpleConfiguratorProps) {
  return (
    <Suspense fallback={<ConfiguratorLoading />}>
      <VeeamConfigurator {...props} />
    </Suspense>
  );
}
