import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, value, ...props }, ref) => {
    console.log('[Input] render:', { value, hasOnChange: !!onChange })
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('[Input] onChange event:', {
        eventTargetValue: e.target.value,
        currentPropsValue: value,
        inputElement: e.target,
        actualInputValue: e.currentTarget.value
      })
      onChange?.(e)
    }
    return (
      <input
        type={type}
        value={value}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
