import { memo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TECH_TOOLTIPS } from "@/constants/calculator";

interface TechTermProps {
  term: keyof typeof TECH_TOOLTIPS;
  children?: React.ReactNode;
}

/**
 * TechTerm component displays technical terms with helpful tooltips
 * Memoized to prevent unnecessary re-renders
 */
export const TechTerm = memo(function TechTerm({ term, children }: TechTermProps) {
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
});
