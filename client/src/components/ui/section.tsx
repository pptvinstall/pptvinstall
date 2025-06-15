
import React from "react";
import { cn } from "../../lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  centered?: boolean;
  children: React.ReactNode;
}

export function Section({
  title,
  subtitle,
  centered = false,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "section-padding relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4 relative">
        {(title || subtitle) && (
          <div className={cn(
            "mb-12", 
            centered ? "text-center mx-auto max-w-3xl" : ""
          )}>
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function SectionGridLayout({
  columns = 3,
  className,
  children,
  ...props
}: {
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div 
      className={cn(
        "grid gap-6 md:gap-8", 
        gridCols[columns],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "feature-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
