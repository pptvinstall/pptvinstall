
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
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-5 w-36" />
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-full max-w-md" />
          </div>
        ))}
      </div>
      
      <Skeleton className="h-10 w-full max-w-xs" />
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
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        
        <div className="space-y-4 p-4 border rounded-lg">
          <Skeleton className="h-6 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
      
      <div className="p-4 border rounded-lg space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="pt-3 border-t">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>
      
      <div className="flex justify-center space-x-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
};
