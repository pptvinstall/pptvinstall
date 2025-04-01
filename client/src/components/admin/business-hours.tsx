import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, parse } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { Info } from 'lucide-react';

interface BusinessHoursProps {
  password?: string;
}

interface BusinessHour {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  updatedAt?: string;
}

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

// Default times for each day based on business requirements
const defaultTimes = {
  // Weekend (Saturday, Sunday)
  weekend: {
    startTime: '11:00',
    endTime: '19:00'
  },
  // Weekday (Monday through Friday)
  weekday: {
    startTime: '18:30',
    endTime: '22:30'
  }
};

export function BusinessHours({ password }: BusinessHoursProps) {
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const { toast } = useToast();
  
  // Get the admin password from localStorage if not provided through props
  const storedPassword = localStorage.getItem('adminPassword');
  const adminPassword = password || storedPassword;
  
  // Fetch all business hours
  const { data: businessHours, isLoading, isError, error } = useQuery({
    queryKey: ['/api/admin/business-hours'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/business-hours`);
      if (!res.ok) {
        throw new Error('Failed to fetch business hours');
      }
      const data = await res.json();
      return data.businessHours || [];
    }
  });
  
  // Get the selected day's hours, or use appropriate defaults based on whether it's weekday or weekend
  const selectedDayHours = businessHours?.find((hours: BusinessHour) => 
    hours.dayOfWeek === selectedDay
  ) || {
    dayOfWeek: selectedDay,
    startTime: selectedDay === 0 || selectedDay === 6 
      ? defaultTimes.weekend.startTime 
      : defaultTimes.weekday.startTime,
    endTime: selectedDay === 0 || selectedDay === 6 
      ? defaultTimes.weekend.endTime 
      : defaultTimes.weekday.endTime,
    isAvailable: true
  };
  
  // State for the form
  const [formValues, setFormValues] = useState<BusinessHour>({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true
  });
  
  // Update form values when selected day changes
  useEffect(() => {
    if (selectedDayHours) {
      // Using JSON stringify/parse to create a deep copy to prevent infinite update loop
      setFormValues(JSON.parse(JSON.stringify(selectedDayHours)));
    }
  }, [selectedDay, businessHours]);
  
  // Format time for display (e.g., "09:00" to "9:00 AM")
  const formatTimeForDisplay = (time: string) => {
    if (!time) return '';
    
    try {
      const parsedTime = parse(time, 'HH:mm', new Date());
      return format(parsedTime, 'h:mm a');
    } catch (error) {
      console.error('Error parsing time:', error);
      return time;
    }
  };
  
  // Parse display time back to 24-hour format (e.g., "9:00 AM" to "09:00")
  const parseDisplayTime = (displayTime: string) => {
    if (!displayTime) return '';
    
    try {
      const parsedTime = parse(displayTime, 'h:mm a', new Date());
      return format(parsedTime, 'HH:mm');
    } catch (error) {
      console.error('Error parsing display time:', error);
      return displayTime;
    }
  };
  
  // Update business hours mutation
  const updateBusinessHoursMutation = useMutation({
    mutationFn: async (data: BusinessHour) => {
      return await apiRequest('POST', `/api/admin/business-hours/${data.dayOfWeek}`, {
        startTime: data.startTime,
        endTime: data.endTime,
        isAvailable: data.isAvailable
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Business hours for ${dayNames[selectedDay]} updated successfully.`,
        variant: 'default'
      });
      
      // Invalidate query to fetch updated data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-hours'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update business hours: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessHoursMutation.mutate(formValues);
  };
  
  const handleDayChange = (value: string) => {
    setSelectedDay(parseInt(value));
  };
  
  const handleStartTimeChange = (value: string) => {
    setFormValues(prev => ({ ...prev, startTime: value }));
  };
  
  const handleEndTimeChange = (value: string) => {
    setFormValues(prev => ({ ...prev, endTime: value }));
  };
  
  const handleAvailabilityChange = (checked: boolean) => {
    setFormValues(prev => ({ ...prev, isAvailable: checked }));
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>An error occurred while loading business hours</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{(error as Error)?.message || 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Set your working hours for each day of the week</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="day">Day of Week</Label>
              <Select
                value={selectedDay.toString()}
                onValueChange={handleDayChange}
              >
                <SelectTrigger id="day">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <input
                  id="startTime"
                  type="time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formValues.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <input
                  id="endTime"
                  type="time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formValues.endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isAvailable"
                checked={formValues.isAvailable}
                onCheckedChange={handleAvailabilityChange}
              />
              <Label htmlFor="isAvailable">Available for bookings</Label>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={updateBusinessHoursMutation.isPending}
          >
            {updateBusinessHoursMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Updating...
              </>
            ) : (
              'Update Business Hours'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start border-t p-4">
        <p className="text-sm text-muted-foreground">
          Set your working hours for each day. These hours will determine when customers can book appointments.
        </p>
      </CardFooter>
    </Card>
  );
}