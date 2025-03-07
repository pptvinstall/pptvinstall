import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const TIME_SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export function TimeBlocking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch blocked times
  const { data: blockedTimes } = useQuery({
    queryKey: ['/api/admin/blocked-times'],
    queryFn: async () => {
      const startDate = new Date();
      const endDate = addMonths(startDate, 3); // Get 3 months of data
      const response = await apiRequest(
        "GET", 
        `/api/admin/blocked-times?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      return response.blockedSlots || {};
    }
  });

  // Block time mutation
  const blockTimeMutation = useMutation({
    mutationFn: async (data: { 
      action: string;
      date?: string;
      dayOfWeek?: string;
      startTime?: string;
      endTime?: string;
      timeSlots?: string[];
      untilDate?: string;
    }) => {
      await apiRequest("POST", "/api/admin/availability", {
        action: data.action,
        data: {
          ...data,
          reason: "Blocked by admin"
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-times'] });
      toast({
        title: "Times Blocked",
        description: "The selected time slots have been blocked successfully.",
      });
      setSelectedTimeSlots([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block time slots. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Get blocked slots for selected date
  const getBlockedSlotsForDate = (date: Date) => {
    if (!blockedTimes) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedTimes[dateStr] || [];
  };

  // Handle blocking times
  const handleBlockTimes = () => {
    if (!selectedDate || selectedTimeSlots.length === 0) return;

    if (isRecurring) {
      blockTimeMutation.mutate({
        action: 'setRecurringBlock',
        dayOfWeek: selectedDay,
        startTime: selectedTimeSlots[0],
        endTime: selectedTimeSlots[selectedTimeSlots.length - 1],
        untilDate: addMonths(new Date(), 3).toISOString() // Set recurring for 3 months
      });
    } else {
      blockTimeMutation.mutate({
        action: 'blockTimeSlot',
        date: format(selectedDate, "yyyy-MM-dd"),
        timeSlots: selectedTimeSlots
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Block Time Slots</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring">Recurring Schedule</Label>
            </div>

            {isRecurring ? (
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day of week" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Available Time Slots</h4>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isBlocked = selectedDate && 
                    getBlockedSlotsForDate(selectedDate).includes(slot);

                  return (
                    <Button
                      key={slot}
                      variant={isBlocked ? "destructive" : (
                        selectedTimeSlots.includes(slot) ? "default" : "outline"
                      )}
                      size="sm"
                      onClick={() => {
                        if (isBlocked) {
                          blockTimeMutation.mutate({
                            action: 'unblockTimeSlot',
                            date: format(selectedDate!, "yyyy-MM-dd"),
                            timeSlots: [slot]
                          });
                        } else {
                          setSelectedTimeSlots(prev => 
                            prev.includes(slot) 
                              ? prev.filter(s => s !== slot)
                              : [...prev, slot]
                          );
                        }
                      }}
                    >
                      {slot}
                    </Button>
                  );
                })}
              </div>
            </div>

            {selectedTimeSlots.length > 0 && (
              <Button 
                className="w-full mt-4"
                onClick={handleBlockTimes}
                disabled={blockTimeMutation.isPending}
              >
                {blockTimeMutation.isPending 
                  ? "Blocking..." 
                  : `Block ${isRecurring ? 'Recurring' : 'Selected'} Times`}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}