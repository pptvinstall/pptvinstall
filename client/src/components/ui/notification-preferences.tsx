
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock, Calendar, Smartphone, Mail } from "lucide-react";

interface NotificationPreferencesProps {
  bookingId: number;
  phone: string;
  email: string;
}

export function NotificationPreferences({ bookingId, phone, email }: NotificationPreferencesProps) {
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("day");
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [emailAddress, setEmailAddress] = useState(email);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSavePreferences = () => {
    setIsSaving(true);
    
    // Simulate API call to save preferences
    setTimeout(() => {
      setIsSaving(false);
      
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      });
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <span>Appointment Reminders</span>
        </CardTitle>
        <CardDescription>
          Choose how you'd like to be reminded about your upcoming appointment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <Smartphone className="h-5 w-5 mt-0.5 text-brand-blue-500" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-notifications" className="font-medium">SMS Notifications</Label>
                <Switch 
                  id="sms-notifications" 
                  checked={smsEnabled}
                  onCheckedChange={setSmsEnabled}
                />
              </div>
              {smsEnabled && (
                <div className="space-y-2">
                  <Input 
                    type="tel" 
                    placeholder="Your phone number" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Standard message rates may apply
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <Mail className="h-5 w-5 mt-0.5 text-brand-blue-500" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                <Switch 
                  id="email-notifications" 
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>
              {emailEnabled && (
                <Input 
                  type="email" 
                  placeholder="Your email address" 
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="flex items-start space-x-4 pt-2">
            <Clock className="h-5 w-5 mt-0.5 text-brand-blue-500" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="reminder-time" className="font-medium">Reminder Timing</Label>
              <Select defaultValue={reminderTime} onValueChange={setReminderTime}>
                <SelectTrigger id="reminder-time" className="w-full">
                  <SelectValue placeholder="Select when to be reminded" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">1 week before</SelectItem>
                  <SelectItem value="day">1 day before</SelectItem>
                  <SelectItem value="hours">3 hours before</SelectItem>
                  <SelectItem value="all">All of the above</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <div className="flex gap-3">
            <Calendar className="h-5 w-5 text-brand-blue-500" />
            <div>
              <h3 className="font-medium text-brand-blue-800 mb-1">
                What you'll receive:
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Appointment confirmation</li>
                <li>• Reminder before your appointment</li>
                <li>• Technician arrival notification</li>
                <li>• Weather alerts (if applicable)</li>
              </ul>
            </div>
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={handleSavePreferences}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
