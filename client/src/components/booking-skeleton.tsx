import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const BookingFormSkeleton = () => {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array(2).fill(0).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              {Array(3).fill(0).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BookingDetailsSkeleton = () => {
  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-64 mx-auto" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 border rounded-lg">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
          <Skeleton className="h-6 w-28" />
          <div className="space-y-2">
            {Array(2).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};