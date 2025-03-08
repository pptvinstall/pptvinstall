import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface DateTimeStepProps {
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
  isTimeSlotAvailable,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Select Date & Time</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a preferred date and time for your installation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Available Time Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isBookingsLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : !selectedDate ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Please select a date first
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((time) => {
                  const isAvailable = isTimeSlotAvailable(
                    format(selectedDate, "yyyy-MM-dd"),
                    time
                  );
                  return (
                    <Button
                      key={time}
                      variant={
                        selectedTime === time ? "default" : "outline"
                      }
                      className={cn(
                        "w-full justify-center",
                        !isAvailable &&
                          "opacity-50 cursor-not-allowed hover:bg-background hover:text-foreground"
                      )}
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
            )}
          </CardContent>
        </Card>
      </div>

      {selectedDate && selectedTime && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="font-medium">
            Your appointment:{" "}
            <span className="font-bold">
              {format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};