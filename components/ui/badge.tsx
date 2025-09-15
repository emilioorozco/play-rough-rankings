import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-500 text-primary-inverse hover:bg-primary-600",
        secondary:
          "border-transparent bg-secondary-500 text-secondary-inverse hover:bg-secondary-600",
        destructive:
          "border-transparent bg-error-500 text-white hover:bg-error-600",
        outline: "text-secondary-500",
        success:
          "border-transparent bg-success-500 text-white hover:bg-success-600",
        warning:
          "border-transparent bg-warning-500 text-white hover:bg-warning-600",
        info: "border-transparent bg-info-500 text-white hover:bg-info-600",
        accent:
          "border-transparent bg-accent-400 text-accent-inverse hover:bg-accent-500",
        // Status variants
        upcoming: "border-transparent bg-status-upcoming text-white",
        active: "border-transparent bg-status-active text-white",
        completed: "border-transparent bg-status-completed text-white",
        // Tier variants
        bronze: "border-transparent bg-tier-bronze text-white",
        silver: "border-transparent bg-tier-silver text-gray-800",
        gold: "border-transparent bg-tier-gold text-gray-800",
        platinum: "border-transparent bg-tier-platinum text-gray-800",
        diamond: "border-transparent bg-tier-diamond text-gray-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
