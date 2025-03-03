import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface TimeSlotProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  available?: boolean
  selected?: boolean
  time: string
}

const TimeSlot = React.forwardRef<HTMLButtonElement, TimeSlotProps>(
  ({ className, available = true, selected, time, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={selected ? "default" : "outline"}
        className={cn(
          "w-full justify-start text-left font-normal",
          !available && "opacity-50 cursor-not-allowed",
          selected && "border-2 border-primary",
          className
        )}
        disabled={!available}
        {...props}
      >
        <time className="ml-auto">{time}</time>
      </Button>
    )
  }
)
TimeSlot.displayName = "TimeSlot"

export { TimeSlot }
