import { useState, useEffect } from "react";
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
import { useLocation } from "wouter";

// Define weekday and weekend time slots
const WEEKDAY_TIME_SLOTS = [
  "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM"
];

const WEEKEND_TIME_SLOTS = [
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM"
];

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export function TimeBlocking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [blockType, setBlockType] = useState<"slots" | "full-day">("slots");
  const [blockReason, setBlockReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Check admin password on component mount
  useEffect(() => {
    const adminPassword = localStorage.getItem('adminPassword');
    if (!adminPassword) {
      toast({
        title: "Authentication Required",
        description: "Please log in as admin first",
        variant: "destructive"
      });
      setLocation('/admin/login');
      return;
    }
  }, []);

  // Fetch blocked times and days
  const { data: blockedTimes = {}, error: blockedTimesError } = useQuery({
    queryKey: ['/api/admin/blocked-times'],
    queryFn: async () => {
      const adminPassword = localStorage.getItem('adminPassword');
      if (!adminPassword) {
        throw new Error('Admin password not found. Please log in first.');
      }

      const response = await apiRequest(
        "GET", 
        `/api/admin/blocked-times?startDate=${selectedDate.toISOString()}&endDate=${addMonths(selectedDate, 3).toISOString()}&password=${adminPassword}`
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          localStorage.removeItem('adminPassword');
          setLocation('/admin/login');
        }
        throw new Error(error.message || 'Failed to fetch blocked times');
      }

      const data = await response.json();
      return data.blockedSlots || {};
    },
    retry: false
  });

  // Fetch blocked days
  const { data: blockedDays = [], error: blockedDaysError } = useQuery({
    queryKey: ['/api/admin/blocked-days'],
    queryFn: async () => {
      const adminPassword = localStorage.getItem('adminPassword');
      if (!adminPassword) {
        throw new Error('Admin password not found. Please log in first.');
      }

      const response = await apiRequest(
        "GET",
        `/api/admin/blocked-days?startDate=${selectedDate.toISOString()}&endDate=${addMonths(selectedDate, 3).toISOString()}&password=${adminPassword}`
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          localStorage.removeItem('adminPassword');
          setLocation('/admin/login');
        }
        throw new Error(error.message || 'Failed to fetch blocked days');
      }

      const data = await response.json();
      return data.blockedDays || [];
    },
    retry: false
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
      const adminPassword = localStorage.getItem('adminPassword');
      if (!adminPassword) {
        throw new Error('Admin password not found. Please log in first.');
      }

      const response = await apiRequest("POST", "/api/admin/availability", {
        password: adminPassword,
        action: data.action,
        data: {
          ...data,
          reason: data.reason || "Blocked by admin"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          localStorage.removeItem('adminPassword');
          setLocation('/admin/login');
          throw new Error('Please log in again.');
        }
        throw new Error(errorData.message || 'Failed to block time');
      }

      return response.json();
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
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to block time. Please try again.",
        variant: "destructive"
      });
    }
  });

  // If there are authentication errors, redirect to login
  useEffect(() => {
    if (blockedTimesError || blockedDaysError) {
      const error = blockedTimesError || blockedDaysError;
      if (error instanceof Error && error.message.includes('Please log in')) {
        setLocation('/admin/login');
      }
    }
  }, [blockedTimesError, blockedDaysError]);

  // Get blocked slots for selected date
  const getBlockedSlotsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedTimes[dateStr] || [];
  };

  // Get appropriate time slots based on the day
  const getTimeSlots = (date: Date | string) => {
    try {
      // For recurring schedule using day name
      if (typeof date === 'string') {
        const dayIndex = DAYS_OF_WEEK.indexOf(date);
        return dayIndex === 0 || dayIndex === 6 ? WEEKEND_TIME_SLOTS : WEEKDAY_TIME_SLOTS;
      }

      // For specific date
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6 ? WEEKEND_TIME_SLOTS : WEEKDAY_TIME_SLOTS;
    } catch (error) {
      console.error('Error getting time slots:', error);
      return WEEKDAY_TIME_SLOTS; // Default to weekday slots if there's an error
    }
  };

  // Handle blocking times or full days
  const handleBlock = () => {
    // Ensure we have a valid date
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first",
        variant: "destructive"
      });
      return;
    }

    if (blockType === "full-day") {
      blockTimeMutation.mutate({
        action: 'blockFullDay',
        date: format(selectedDate, "yyyy-MM-dd"),
        reason: blockReason
      });
    } else if (isRecurring) {
      const now = new Date();
      blockTimeMutation.mutate({
        action: 'setRecurringBlock',
        dayOfWeek: selectedDay,
        startTime: selectedTimeSlots[0],
        endTime: selectedTimeSlots[selectedTimeSlots.length - 1],
        untilDate: addMonths(now, 3).toISOString(),
        reason: blockReason
      });
    } else {
      // Ensure we have selected time slots
      if (selectedTimeSlots.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one time slot",
          variant: "destructive"
        });
        return;
      }

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

  // Get the time slots to display based on whether we're in recurring mode
  const displayTimeSlots = isRecurring ? getTimeSlots(selectedDay) : getTimeSlots(selectedDate);

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
                onSelect={(date) => date && setSelectedDate(date)}
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
                <h4 className="text-sm font-medium mb-2">
                  Available Time Slots {isRecurring ? `(${selectedDay})` : ''}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {displayTimeSlots.map((slot) => {
                    const isBlocked = !isRecurring && getBlockedSlotsForDate(selectedDate).includes(slot);

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
                              date: format(selectedDate, "yyyy-MM-dd"),
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
              (blockType === "slots" && selectedTimeSlots.length === 0)}
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