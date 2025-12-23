import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-12">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center flex-1">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
              index < currentStep
                ? "bg-primary text-primary-foreground"
                : index === currentStep
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {index < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
          <div className="ml-3">
            <p
              className={`text-sm font-medium ${
                index <= currentStep
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {step}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 mx-4 rounded-full transition-colors ${
                index < currentStep
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
