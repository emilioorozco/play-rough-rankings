import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleClick = () => {
      if (!props.disabled) {
        onCheckedChange?.(!checked);
      }
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background transition-colors cursor-pointer",
            "hover:bg-primary/10 hover:border-primary/80",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-disabled:hover:bg-transparent",
            "peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:hover:bg-primary/90",
            "flex items-center justify-center",
            className,
          )}
          onClick={handleClick}
        >
          {checked && <Check className="h-3 w-3" />}
        </div>
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
