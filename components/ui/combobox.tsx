import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ComboboxTriggerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

interface ComboboxContentProps {
  children?: React.ReactNode;
  className?: string;
}

interface ComboboxItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const ComboboxContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  options: Array<{ value: string; label: string }>;
  filteredOptions: Array<{ value: string; label: string }>;
}>({
  isOpen: false,
  setIsOpen: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  selectedIndex: -1,
  setSelectedIndex: () => {},
  options: [],
  filteredOptions: [],
});

const Combobox: React.FC<ComboboxProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  // Get the label for the current value
  const selectedLabel = React.useMemo(() => {
    const option = options.find(opt => opt.value === value);
    return option?.label || "";
  }, [options, value]);

  // Handle click outside to close
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
        setSearchQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          const option = filteredOptions[selectedIndex];
          onValueChange?.(option.value);
          setIsOpen(false);
          setSearchQuery("");
          setSelectedIndex(-1);
          inputRef.current?.blur();
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        setSearchQuery("");
        inputRef.current?.blur();
        break;
    }
  }, [disabled, filteredOptions, selectedIndex, onValueChange]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setIsOpen(true);
    setSelectedIndex(-1);
  }, []);

  const handleInputFocus = React.useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  const handleOptionClick = React.useCallback((optionValue: string) => {
    onValueChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery("");
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, [onValueChange]);

  const contextValue = React.useMemo(
    () => ({
      value,
      onValueChange,
      isOpen,
      setIsOpen,
      searchQuery,
      setSearchQuery,
      selectedIndex,
      setSelectedIndex,
      options,
      filteredOptions,
    }),
    [
      value,
      onValueChange,
      isOpen,
      searchQuery,
      selectedIndex,
      options,
      filteredOptions,
    ]
  );

  return (
    <ComboboxContext.Provider value={contextValue}>
      <div ref={rootRef} className={cn("relative", className)}>
        <ComboboxTrigger
          ref={inputRef}
          placeholder={isOpen ? "Type to search..." : placeholder}
          value={isOpen ? searchQuery : selectedLabel}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <ComboboxContent>
          {filteredOptions.map((option, index) => (
            <ComboboxItem
              key={option.value}
              value={option.value}
              className={cn(
                index === selectedIndex && "bg-accent text-accent-foreground"
              )}
              onClick={() => handleOptionClick(option.value)}
            >
              <span className="flex-1">{option.label}</span>
              {value === option.value && (
                <Check className="h-4 w-4" />
              )}
            </ComboboxItem>
          ))}
          {filteredOptions.length === 0 && searchQuery && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No options found
            </div>
          )}
        </ComboboxContent>
      </div>
    </ComboboxContext.Provider>
  );
};

const ComboboxTrigger = React.forwardRef<HTMLInputElement, ComboboxTriggerProps>(
  ({ className, ...props }, ref) => {
    const { isOpen } = React.useContext(ComboboxContext);

    const finalClassName = cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
      "placeholder:text-muted-foreground focus:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    );


    return (
      <div className="relative">
        <input
          ref={ref}
          className={finalClassName}
          style={{ boxSizing: 'border-box' }}
          {...props}
        />
        <ChevronDown
          className={cn(
            "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </div>
    );
  },
);
ComboboxTrigger.displayName = "ComboboxTrigger";

const ComboboxContent = React.forwardRef<HTMLDivElement, ComboboxContentProps>(
  ({ children, className }, ref) => {
    const { isOpen } = React.useContext(ComboboxContext);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => contentRef.current!);

    if (!isOpen) return null;

    return (
      <div
        ref={contentRef}
        className={cn(
          "absolute top-full left-0 z-[60] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg",
          className,
        )}
      >
        <div className="max-h-80 overflow-y-auto p-1">
          {children}
        </div>
      </div>
    );
  },
);
ComboboxContent.displayName = "ComboboxContent";

const ComboboxItem = React.forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ className, children, value, onClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none",
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          className,
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ComboboxItem.displayName = "ComboboxItem";

export { Combobox, ComboboxTrigger, ComboboxContent, ComboboxItem };
