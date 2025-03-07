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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [blockType, setBlockType] = useState<"slots" | "full-day">("slots");
  const [blockReason, setBlockReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch blocked times and days
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

  // Fetch blocked days
  const { data: blockedDays = [] } = useQuery({
    queryKey: ['/api/admin/blocked-days'],
    queryFn: async () => {
      const startDate = new Date();
      const endDate = addMonths(startDate, 3);
      const response = await apiRequest(
        "GET",
        `/api/admin/blocked-days?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      return response.blockedDays || [];
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
      reason?: string;
    }) => {
      await apiRequest("POST", "/api/admin/availability", {
        action: data.action,
        data: {
          ...data,
          reason: data.reason || "Blocked by admin"
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-times'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-days'] });
      toast({
        title: blockType === "slots" ? "Times Blocked" : "Day Blocked",
        description: blockType === "slots" 
          ? "The selected time slots have been blocked successfully."
          : "The selected day has been marked as unavailable.",
      });
      setSelectedTimeSlots([]);
      setBlockReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block time. Please try again.",
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

  // Handle blocking times or full days
  const handleBlock = () => {
    if (!selectedDate) return;

    if (blockType === "full-day") {
      blockTimeMutation.mutate({
        action: 'blockFullDay',
        date: format(selectedDate, "yyyy-MM-dd"),
        reason: blockReason
      });
    } else if (isRecurring) {
      blockTimeMutation.mutate({
        action: 'setRecurringBlock',
        dayOfWeek: selectedDay,
        startTime: selectedTimeSlots[0],
        endTime: selectedTimeSlots[selectedTimeSlots.length - 1],
        untilDate: addMonths(new Date(), 3).toISOString(), // Set recurring for 3 months
        reason: blockReason
      });
    } else {
      blockTimeMutation.mutate({
        action: 'blockTimeSlot',
        date: format(selectedDate, "yyyy-MM-dd"),
        timeSlots: selectedTimeSlots,
        reason: blockReason
      });
    }
  };

  const isDateBlocked = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedDays.includes(dateStr);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Block Time Slots</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={blockType} onValueChange={(value) => setBlockType(value as "slots" | "full-day")} className="mb-6">
          <TabsList>
            <TabsTrigger value="slots">Block Time Slots</TabsTrigger>
            <TabsTrigger value="full-day">Block Full Day</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            {blockType === "slots" && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
                <Label htmlFor="recurring">Recurring Schedule</Label>
              </div>
            )}

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
                modifiers={{
                  blocked: (date) => isDateBlocked(date)
                }}
                modifiersStyles={{
                  blocked: { 
                    backgroundColor: "var(--destructive)", 
                    color: "white",
                    opacity: 0.5 
                  }
                }}
              />
            )}

            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g., Personal Day, Vacation, Holiday"
                className="mt-1"
              />
            </div>
          </div>

          {blockType === "slots" && (
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
            </div>
          )}

          <Button 
            className="w-full mt-4 md:col-span-2"
            onClick={handleBlock}
            disabled={blockTimeMutation.isPending || 
              (blockType === "slots" && selectedTimeSlots.length === 0) ||
              !selectedDate}
          >
            {blockTimeMutation.isPending 
              ? "Blocking..." 
              : blockType === "full-day"
                ? "Block Full Day"
                : `Block ${isRecurring ? 'Recurring' : 'Selected'} Times`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}