"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useDropdown } from "@/stores/ui-store"

// Create a context for dropdown ID management
const DropdownContext = React.createContext<{
  dropdownId: string
} | null>(null)

// Custom hook to use dropdown context
function useDropdownContext() {
  const context = React.useContext(DropdownContext)
  if (!context) {
    throw new Error("Dropdown components must be used within a DropdownMenu")
  }
  return context
}

interface DropdownMenuProps {
  children: React.ReactNode
  id?: string
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, id }) => {
  const dropdownId = React.useId()
  const finalId = id || `dropdown-${dropdownId}`

  return (
    <DropdownContext.Provider value={{ dropdownId: finalId }}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, asChild = false, ...props }, ref) => {
    const { dropdownId } = useDropdownContext()
    const { isOpen, toggle } = useDropdown(dropdownId)

    if (asChild && React.isValidElement(children)) {
      // Type-safe clone element with proper onClick handling
      const childProps = children.props as React.HTMLAttributes<HTMLElement> & {
        onClick?: (e: React.MouseEvent) => void
      }
      
      return React.cloneElement(children, {
        ...props,
        ...(ref && { ref }),
        onClick: (e: React.MouseEvent) => {
          toggle()
          childProps.onClick?.(e)
        }
      } as React.HTMLAttributes<HTMLElement>)
    }

    return (
      <button
        ref={ref}
        className={cn(className)}
        onClick={toggle}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  sideOffset?: number
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = "end", sideOffset = 4, children, ...props }, ref) => {
    const { dropdownId } = useDropdownContext()
    const { isOpen } = useDropdown(dropdownId)

    if (!isOpen) return null

    return (
      <div
        ref={ref}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
          className
        )}
        style={{ marginTop: sideOffset }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, inset, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

// Simplified exports for the basic functionality needed
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
