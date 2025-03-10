import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Info } from "lucide-react";
import { useBusinessHours } from "@/hooks/use-business-hours";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  // Get business hours for displaying info
  const { businessHours, isLoading: isLoadingBusinessHours } = useBusinessHours();
  
  const formatDateWithDay = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy");
  };
  
  // Format business hours for the selected day
  const getBusinessHoursForSelectedDay = () => {
    if (!selectedDate || !businessHours) return null;
    
    const dayOfWeek = selectedDate.getDay();
    const hoursForDay = businessHours.find((h: any) => h.dayOfWeek === dayOfWeek);
    
    if (!hoursForDay || !hoursForDay.isAvailable) return "Closed";
    
    // Convert 24h format to 12h AM/PM format
    const formatTimeString = (time24h: string) => {
      const [hours, minutes] = time24h.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    
    return `${formatTimeString(hoursForDay.startTime)} - ${formatTimeString(hoursForDay.endTime)}`;
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
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="font-medium">Select Date</span>
              </div>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center text-xs text-muted-foreground cursor-help">
                      <Info className="h-3.5 w-3.5 mr-1" />
                      <span>Business Hours</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Our Working Hours:</p>
                      <p>Monday-Friday: 6:30 PM - 10:30 PM</p>
                      <p>Saturday-Sunday: 11:00 AM - 7:00 PM</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="calendar-container relative">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  // Disable dates in the past
                  const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
                  
                  if (isPastDate) return true;
                  
                  // Check if business hours exist for this day
                  if (businessHours && businessHours.length > 0) {
                    const dayOfWeek = date.getDay();
                    const hoursForDay = businessHours.find((h: any) => h.dayOfWeek === dayOfWeek);
                    
                    // If no business hours set for this day or marked as unavailable
                    if (!hoursForDay || !hoursForDay.isAvailable) {
                      return true;
                    }
                  }
                  
                  return false;
                }}
                className="rounded-md border mx-auto w-full"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span className="font-medium">Select Time</span>
              </div>
              {selectedDate && (
                <div className="text-xs text-muted-foreground">
                  {isLoadingBusinessHours ? (
                    <LoadingSpinner size="sm" className="mr-1" />
                  ) : (
                    <span className="flex items-center">
                      Hours: <span className="font-medium ml-1">{getBusinessHoursForSelectedDay()}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            {selectedDate ? (
              isBookingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                timeSlots.length > 0 ? (
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
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 border rounded-md border-dashed">
                    <p className="text-muted-foreground text-sm text-center px-4">
                      No time slots available for this date. Please select another date.
                    </p>
                  </div>
                )}
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