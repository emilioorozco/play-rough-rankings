import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  disabled?: boolean;
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
  selectId?: string;
  registerItem?: (value: string, label: string) => void;
  getLabel?: (value?: string) => string | undefined;
}>({ isOpen: false, setIsOpen: () => {} });

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectId = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const itemsRef = React.useRef<Map<string, string>>(new Map());

  const registerItem = React.useCallback((val: string, label: string) => {
    itemsRef.current.set(val, label);
  }, []);

  const getLabel = React.useCallback((val?: string) => {
    if (!val) return undefined;
    return itemsRef.current.get(val);
  }, []);

  React.useEffect(() => {
    function handleOtherOpen(event: Event) {
      const custom = event as CustomEvent<string>;
      if (custom.detail !== selectId) {
        setIsOpen(false);
      }
    }

    window.addEventListener("prr-select-open", handleOtherOpen as EventListener);
    return () => {
      window.removeEventListener(
        "prr-select-open",
        handleOtherOpen as EventListener,
      );
    };
  }, [selectId]);

  // Close on click outside and on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    
    function handleDocumentClick(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && !root.contains(target)) {
        // Use setTimeout to prevent conflicts with click handlers
        setTimeout(() => setIsOpen(false), 0);
      }
    }
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    
    // Use capture phase to ensure we catch the event before other handlers
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const contextValue = React.useMemo(
    () => ({ value, onValueChange, isOpen, setIsOpen, selectId, registerItem, getLabel }),
    [value, onValueChange, isOpen, selectId, registerItem, getLabel],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={rootRef} className="relative" data-select-id={selectId}>{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen, selectId } = React.useContext(SelectContext);

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
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = !isOpen;
          if (next) {
            const ev = new CustomEvent("prr-select-open", {
              detail: selectId,
            });
            // Fallback to useId tied event if data-id not available
            try {
              window.dispatchEvent(ev);
            } catch {}
          }
          setIsOpen(next);
        }}
        onFocus={() => {
          // Don't auto-open on focus to prevent conflicts
        }}
        onBlur={() => {
          // Don't auto-close on blur to prevent conflicts
        }}
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
  const { value, getLabel } = React.useContext(SelectContext);
  const [label, setLabel] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (value) {
      const foundLabel = getLabel?.(value);
      if (foundLabel) {
        setLabel(foundLabel);
      } else {
        // If label not found immediately, keep trying with increasing delays
        // This handles cases where items are registered after the component mounts
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryGetLabel = () => {
          attempts++;
          const retryLabel = getLabel?.(value);
          
          if (retryLabel) {
            setLabel(retryLabel);
          } else if (attempts < maxAttempts) {
            // Try again with increasing delay
            setTimeout(tryGetLabel, attempts * 10);
          }
        };
        
        const timeoutId = setTimeout(tryGetLabel, 10);
        return () => clearTimeout(timeoutId);
      }
    } else {
      setLabel(undefined);
    }
  }, [value, getLabel, placeholder]);
  return (
    <span className={cn(label ? "text-foreground" : "text-muted-foreground")}>
      {label || placeholder}
    </span>
  );
};

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ children, className }, ref) => {
    const { isOpen } = React.useContext(SelectContext);


    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-full left-0 z-[60] mt-1 max-h-96 min-w-full overflow-visible rounded-md border bg-popover text-popover-foreground shadow-md",
          !isOpen && "hidden", // Hide instead of not rendering
          className,
        )}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  },
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const {
      value: selectedValue,
      onValueChange,
      setIsOpen,
      registerItem,
    } = React.useContext(SelectContext);
    const isSelected = selectedValue === value;

    // Extract plain text label from children if possible
    React.useEffect(() => {
      let text = "";
      const toText = (node: React.ReactNode): string => {
        if (typeof node === "string" || typeof node === "number") return String(node);
        if (Array.isArray(node)) return node.map(toText).join("");
        return "";
      };
      text = toText(children);
      if (text && registerItem) {
        registerItem(value, text);
      }
    }, [children, value, registerItem]);

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none",
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground",
          className,
        )}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('SelectItem clicked:', value); // Debug log
          onValueChange?.(value);
          setIsOpen(false);
        }}
      >
        {children}
      </div>
    );
  },
);
SelectItem.displayName = "SelectItem";

// Simplified exports for the basic functionality needed
export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
