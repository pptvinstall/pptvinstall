import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />
    </div>
  );
}

export default LoadingSpinner;
import { cn } from "@/lib/utils";

type SpinnerSize = "small" | "medium" | "large";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  color?: string;
  text?: string;
}

const sizeMap = {
  small: "h-4 w-4 border-2",
  medium: "h-8 w-8 border-2",
  large: "h-12 w-12 border-3",
};

const LoadingSpinner = ({
  size = "medium",
  className,
  color = "currentColor",
  text,
}: LoadingSpinnerProps) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={cn(
          "animate-spin rounded-full border-t-transparent",
          sizeMap[size],
          className
        )}
        style={{ borderTopColor: "transparent", borderColor: color }}
      />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
