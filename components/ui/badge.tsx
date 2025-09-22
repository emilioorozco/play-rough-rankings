import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-success-500 text-white hover:bg-success-600",
        warning:
          "border-transparent bg-warning-500 text-white hover:bg-warning-600",
        info: "border-transparent bg-info-500 text-white hover:bg-info-600",
        accent:
          "border-transparent bg-accent text-accent-foreground hover:bg-accent/90",
        // Role-specific variants with better contrast
        admin: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        organizer: "border-transparent bg-accent text-accent-foreground hover:bg-accent/90",
        player: "border-transparent bg-muted text-muted-foreground hover:bg-muted/90",
        // Status variants
        upcoming: "border-transparent bg-info-500 text-white hover:bg-info-600",
        active: "border-transparent bg-success-500 text-white hover:bg-success-600",
        completed: "border-transparent bg-muted text-muted-foreground hover:bg-muted/90",
        // Tier variants
        bronze: "border-transparent bg-orange-600 text-white hover:bg-orange-700",
        silver: "border-transparent bg-gray-400 text-gray-900 hover:bg-gray-500",
        gold: "border-transparent bg-yellow-500 text-gray-900 hover:bg-yellow-600",
        platinum: "border-transparent bg-gray-200 text-gray-900 hover:bg-gray-300",
        diamond: "border-transparent bg-blue-300 text-gray-900 hover:bg-blue-400",
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
