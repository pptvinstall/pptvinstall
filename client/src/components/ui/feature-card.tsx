
import React from "react";
import { cn } from "../../lib/utils";

interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  withHoverEffect?: boolean;
}

export function FeatureCard({
  icon,
  title,
  description,
  withHoverEffect = true,
  className,
  ...props
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "feature-card",
        withHoverEffect && "transform transition-all duration-300 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-brand-blue-600 text-2xl">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
