import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => {
  // Create a style object with explicit positioning
  const containerStyle = {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    contain: 'layout' as const
  };
  
  const viewportStyle = {
    position: 'relative' as const,
    height: '100%' as const,
    width: '100%' as const
  };
  
  // Add a wrapper div with explicit positioning to prevent the warning
  return (
    <div className="scroll-area-wrapper relative" style={{ position: 'relative' }}>
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        style={containerStyle}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport 
          className="h-full w-full rounded-[inherit] relative" 
          style={viewportStyle}
        >
          <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </div>
  );
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }