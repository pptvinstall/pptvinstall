import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TIME_SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

export function TimeBlocking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch blocked times
  const { data: blockedTimes = [] } = useQuery({
    queryKey: ['/api/admin/blocked-times'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/blocked-times");
      return response.blockedTimes;
    }
  });

  // Block time mutation
  const blockTimeMutation = useMutation({
    mutationFn: async (data: { date: string; timeSlots: string[] }) => {
      await apiRequest("POST", "/api/admin/block-time", data);
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

  // Unblock time mutation
  const unblockTimeMutation = useMutation({
    mutationFn: async (data: { date: string; timeSlots: string[] }) => {
      await apiRequest("DELETE", "/api/admin/block-time", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-times'] });
      toast({
        title: "Times Unblocked",
        description: "The selected time slots have been unblocked successfully.",
      });
    }
  });

  // Get blocked slots for selected date
  const getBlockedSlotsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedTimes.find(bt => bt.date === dateStr)?.timeSlots || [];
  };

  // Handle blocking times
  const handleBlockTimes = () => {
    if (!selectedDate || selectedTimeSlots.length === 0) return;

    blockTimeMutation.mutate({
      date: format(selectedDate, "yyyy-MM-dd"),
      timeSlots: selectedTimeSlots
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Block Time Slots</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
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
                          unblockTimeMutation.mutate({
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
                {blockTimeMutation.isPending ? "Blocking..." : "Block Selected Times"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
