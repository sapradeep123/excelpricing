import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Search, Plus, Share2 } from "lucide-react";
import webberstopLogo from "@assets/webberstop-logo.png";

interface LandingPageProps {
  onCreateEstimate: () => void;
}

/**
 * LandingPage component - entry point for the pricing calculator
 * Memoized since it has no dynamic content
 */
export const LandingPage = memo(function LandingPage({ onCreateEstimate }: LandingPageProps) {
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
});
