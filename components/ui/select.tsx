import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

interface SelectContentProps {
  children?: React.ReactNode;
  className?: string;
}

interface SelectItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({ isOpen: false, setIsOpen: () => {} });

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext);

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext);
  const [displayValue, setDisplayValue] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (value) {
      // Find the display value from SelectItem children
      // This is a simplified approach
      setDisplayValue(value);
    } else {
      setDisplayValue(undefined);
    }
  }, [value]);

  return (
    <span className={cn(!displayValue && "text-muted-foreground")}>
      {displayValue || placeholder}
    </span>
  );
};

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ children, className }, ref) => {
    const { isOpen } = React.useContext(SelectContext);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-full left-0 z-50 mt-1 max-h-96 min-w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
          className,
        )}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  },
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const {
      value: selectedValue,
      onValueChange,
      setIsOpen,
    } = React.useContext(SelectContext);
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none",
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground",
          className,
        )}
        onClick={() => {
          onValueChange?.(value);
          setIsOpen(false);
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);
SelectItem.displayName = "SelectItem";

// Simplified exports for the basic functionality needed
export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
