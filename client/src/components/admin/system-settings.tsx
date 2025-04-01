import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function SystemSettings() {
  const [bookingBuffer, setBookingBuffer] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { toast } = useToast();
  const adminPassword = localStorage.getItem("adminPassword");

  // Load system settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/system-settings/booking-buffer');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.setting) {
            setBookingBuffer(data.setting.bookingBufferHours || 2);
          }
        } else {
          console.error("Failed to fetch booking buffer setting");
        }
      } catch (error) {
        console.error("Error fetching booking buffer setting:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveBookingBuffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/system-settings/bookingBufferHours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: adminPassword,
          bookingBufferHours: Number(bookingBuffer)
        }),
      });

      if (response.ok) {
        toast({
          title: "Settings Updated",
          description: "Booking buffer time has been updated successfully.",
          variant: "default",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update booking buffer");
      }
    } catch (error) {
      console.error("Error updating booking buffer:", error);
      toast({
        title: "Error",
        description: "Failed to update booking buffer time. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Settings</CardTitle>
          <CardDescription>Configure appointment booking parameters</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSaveBookingBuffer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Minimum Booking Buffer (hours)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="72"
                    step="0.5"
                    value={bookingBuffer}
                    onChange={(e) => setBookingBuffer(Number(e.target.value))}
                    className="max-w-[100px]"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum time in advance that customers must book appointments (default: 2 hours)
                </p>
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}