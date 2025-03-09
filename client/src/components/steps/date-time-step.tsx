import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export interface DateTimeStepProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string | undefined;
  setSelectedTime: (time: string | undefined) => void;
  isBookingsLoading: boolean;
  timeSlots: string[];
  isTimeSlotAvailable: (date: string, time: string) => boolean;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  isBookingsLoading,
  timeSlots,
  isTimeSlotAvailable
}) => {
  const formatDateWithDay = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy");
  };

  return (
    <Card className="w-full mt-4 relative">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <CardTitle className="text-xl sm:text-2xl">Select Date & Time</CardTitle>
        <CardDescription>
          Choose a date and time for your service appointment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Date Selection */}
          <div className="relative">
            <div className="mb-4 flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="font-medium">Select Date</span>
            </div>
            <div className="calendar-container relative">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  // Disable dates in the past
                  return date < new Date(new Date().setHours(0, 0, 0, 0));
                }}
                className="rounded-md border mx-auto w-full"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="relative">
            <div className="mb-4 flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <span className="font-medium">Select Time</span>
            </div>
            {selectedDate ? (
              isBookingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timeSlots.map((time) => {
                    const isAvailable = isTimeSlotAvailable(
                      format(selectedDate, "yyyy-MM-dd"),
                      time
                    );
                    return (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        className={`${!isAvailable ? "opacity-50 cursor-not-allowed" : ""} text-sm sm:text-base`}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedTime(time);
                          }
                        }}
                        disabled={!isAvailable}
                      >
                        {time}
                      </Button>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-32 border rounded-md border-dashed">
                <p className="text-muted-foreground text-sm">
                  Please select a date first
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Date & Time Summary */}
        {selectedDate && selectedTime && (
          <div className="bg-primary/10 p-4 rounded-md mt-4">
            <h3 className="font-medium mb-2">Your Appointment</h3>
            <p className="text-sm sm:text-base">
              Date: <span className="font-medium">{formatDateWithDay(selectedDate)}</span>
            </p>
            <p className="text-sm sm:text-base">
              Time: <span className="font-medium">{selectedTime}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};