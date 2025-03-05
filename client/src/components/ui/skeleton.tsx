import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
  animate?: boolean;
}

const radiusMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({
  className,
  width,
  height,
  rounded = "md",
  animate = true,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width || "100%",
    height: height || "1rem",
  };

  return (
    <div
      className={cn(
        "bg-gray-200",
        radiusMap[rounded],
        animate && "animate-pulse",
        className
      )}
      style={style}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <Skeleton height={28} className="mb-4" />
      <Skeleton height={100} className="mb-4" />
      <div className="space-y-2">
        <Skeleton height={12} />
        <Skeleton height={12} />
        <Skeleton height={12} width="75%" />
      </div>
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <Skeleton height={200} rounded="lg" className="mb-4" />
      <div className="p-4">
        <Skeleton height={24} className="mb-2" />
        <Skeleton height={16} className="mb-4" />
        <div className="space-y-2 mb-4">
          <Skeleton height={10} />
          <Skeleton height={10} />
          <Skeleton height={10} width="60%" />
        </div>
        <Skeleton height={40} rounded="md" />
      </div>
    </div>
  );
}

export function TestimonialSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center mb-4">
        <Skeleton height={50} width={50} rounded="full" className="mr-3" />
        <div>
          <Skeleton height={16} width={120} className="mb-1" />
          <Skeleton height={12} width={80} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton height={12} />
        <Skeleton height={12} />
        <Skeleton height={12} width="75%" />
      </div>
    </div>
  );
}