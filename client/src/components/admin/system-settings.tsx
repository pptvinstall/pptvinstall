import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Clock, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  DollarSign, 
  Settings as SettingsIcon,
  AlertCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SystemSetting {
  id?: number;
  name: string;
  value: any;
  updatedAt?: string;
}

// Main system settings interface
export function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({
    bookingBufferHours: 2,
    maxAdvanceBookingDays: 60,
    businessName: "Atlanta TV Mounting Pros",
    businessEmail: "contact@atlantatvmounting.com",
    businessPhone: "(404) 555-1234",
    businessAddress: "123 Peachtree St, Atlanta, GA 30308",
    enableSocialSharing: true,
    maintenanceMode: false,
    customCss: "",
    enableReviews: true,
    enableEmailNotifications: true,
    emailNotificationRecipients: "",
    enableSmsNotifications: false,
    smsNotificationNumber: "",
    pricingVersionId: "default",
    taxRate: 8.5,
    serviceAreaZipCodes: ""
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<string[]>([]);
  const { toast } = useToast();
  const adminPassword = localStorage.getItem("adminPassword");

  // Load all system settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/system-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            // Create a map of settings by name
            const settingsMap: Record<string, any> = {};
            
            data.settings.forEach((setting: SystemSetting) => {
              // Try to parse JSON values
              try {
                const parsedValue = JSON.parse(setting.value);
                settingsMap[setting.name] = parsedValue;
              } catch (e) {
                // If not JSON, use as is
                settingsMap[setting.name] = setting.value;
              }
            });
            
            // Merge with default settings
            setSettings(prevSettings => ({
              ...prevSettings,
              ...settingsMap
            }));
            
            console.log("Loaded system settings:", settingsMap);
          }
        } else {
          console.error("Failed to fetch system settings");
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle saving a setting
  const handleSaveSetting = async (name: string, value: any) => {
    if (savingSettings.includes(name)) return;
    
    setSavingSettings((prev) => [...prev, name]);

    try {
      const payload: Record<string, any> = {
        password: adminPassword,
      };
      
      // For the admin API endpoint, we need to nest the value under the expected property
      if (name === 'bookingBufferHours') {
        payload.bookingBufferHours = value;
      } else {
        payload.value = value;
      }
      
      const response = await fetch(`/api/admin/system-settings/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Setting Updated",
          description: `${formatSettingName(name)} has been updated successfully.`,
          variant: "default",
        });
        
        // Update local state
        setSettings(prev => ({
          ...prev,
          [name]: value
        }));
      } else {
        const error = await response.json();
        throw new Error(error.message || `Failed to update ${name}`);
      }
    } catch (error) {
      console.error(`Error updating ${name}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${formatSettingName(name)}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSavingSettings((prev) => prev.filter(item => item !== name));
    }
  };

  // Format setting name for display
  const formatSettingName = (name: string): string => {
    return name
      .replace(/([A-Z])/g, ' $1') // Insert a space before all capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize the first letter
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase
  };
  
  // Helper to check if a setting is currently being saved
  const isSaving = (name: string): boolean => {
    return savingSettings.includes(name);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">
            Configure and customize your business settings
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="booking" className="space-y-6">
        <TabsList className="grid grid-cols-4 md:grid-cols-6 lg:w-[600px]">
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        {/* Booking Settings */}
        <TabsContent value="booking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Booking Settings
              </CardTitle>
              <CardDescription>Configure appointment booking parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Booking Time Restrictions</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Control when customers can book appointments
                  </p>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SettingItem
                      label="Minimum Booking Buffer"
                      description="Minimum time in advance for booking (hours)"
                      icon={Clock}
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="72"
                          step="0.5"
                          value={settings.bookingBufferHours}
                          onChange={(e) => setSettings({
                            ...settings,
                            bookingBufferHours: Number(e.target.value)
                          })}
                          className="max-w-[100px]"
                        />
                        <span className="text-sm text-muted-foreground">hours</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving('bookingBufferHours')}
                          onClick={() => handleSaveSetting('bookingBufferHours', settings.bookingBufferHours)}
                        >
                          {isSaving('bookingBufferHours') ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </SettingItem>

                    <SettingItem
                      label="Maximum Advance Booking"
                      description="How far in advance customers can book"
                      icon={Calendar}
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={settings.maxAdvanceBookingDays}
                          onChange={(e) => setSettings({
                            ...settings,
                            maxAdvanceBookingDays: Number(e.target.value)
                          })}
                          className="max-w-[100px]"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving('maxAdvanceBookingDays')}
                          onClick={() => handleSaveSetting('maxAdvanceBookingDays', settings.maxAdvanceBookingDays)}
                        >
                          {isSaving('maxAdvanceBookingDays') ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </SettingItem>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-base">Service Area</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Define the ZIP codes where your service is available
                  </p>
                  
                  <SettingItem
                    label="Service Area ZIP Codes"
                    description="Enter ZIP codes separated by commas"
                    icon={MapPin}
                  >
                    <div className="space-y-2">
                      <Textarea
                        value={settings.serviceAreaZipCodes}
                        onChange={(e) => setSettings({
                          ...settings,
                          serviceAreaZipCodes: e.target.value
                        })}
                        placeholder="30301, 30302, 30303..."
                        className="min-h-[80px]"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving('serviceAreaZipCodes')}
                          onClick={() => handleSaveSetting('serviceAreaZipCodes', settings.serviceAreaZipCodes)}
                        >
                          {isSaving('serviceAreaZipCodes') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save ZIP Codes
                        </Button>
                      </div>
                    </div>
                  </SettingItem>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Business Information */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Update your business contact and location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <SettingItem
                  label="Business Name"
                  description="Your company's official name"
                  icon={SettingsIcon}
                >
                  <div className="space-y-2">
                    <Input
                      value={settings.businessName}
                      onChange={(e) => setSettings({
                        ...settings,
                        businessName: e.target.value
                      })}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSaving('businessName')}
                        onClick={() => handleSaveSetting('businessName', settings.businessName)}
                      >
                        {isSaving('businessName') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </SettingItem>
                
                <SettingItem
                  label="Business Email"
                  description="Public contact email address"
                  icon={Mail}
                >
                  <div className="space-y-2">
                    <Input
                      type="email"
                      value={settings.businessEmail}
                      onChange={(e) => setSettings({
                        ...settings,
                        businessEmail: e.target.value
                      })}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSaving('businessEmail')}
                        onClick={() => handleSaveSetting('businessEmail', settings.businessEmail)}
                      >
                        {isSaving('businessEmail') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </SettingItem>
                
                <SettingItem
                  label="Business Phone"
                  description="Main contact phone number"
                  icon={Phone}
                >
                  <div className="space-y-2">
                    <Input
                      type="tel"
                      value={settings.businessPhone}
                      onChange={(e) => setSettings({
                        ...settings,
                        businessPhone: e.target.value
                      })}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSaving('businessPhone')}
                        onClick={() => handleSaveSetting('businessPhone', settings.businessPhone)}
                      >
                        {isSaving('businessPhone') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </SettingItem>
                
                <SettingItem
                  label="Business Address"
                  description="Full address for your business"
                  icon={MapPin}
                >
                  <div className="space-y-2">
                    <Textarea
                      value={settings.businessAddress}
                      onChange={(e) => setSettings({
                        ...settings,
                        businessAddress: e.target.value
                      })}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSaving('businessAddress')}
                        onClick={() => handleSaveSetting('businessAddress', settings.businessAddress)}
                      >
                        {isSaving('businessAddress') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </SettingItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure how you receive booking notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingItem
                label="Email Notifications"
                description="Receive email notifications for new bookings and changes"
                icon={Mail}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotifications" className="flex-1">
                      Enable email notifications
                    </Label>
                    <Switch
                      id="emailNotifications"
                      checked={settings.enableEmailNotifications}
                      onCheckedChange={(checked) => {
                        setSettings({
                          ...settings,
                          enableEmailNotifications: checked
                        });
                        handleSaveSetting('enableEmailNotifications', checked);
                      }}
                    />
                  </div>
                  
                  {settings.enableEmailNotifications && (
                    <div className="space-y-2">
                      <Label htmlFor="emailRecipients">Notification recipients (comma separated)</Label>
                      <Textarea
                        id="emailRecipients"
                        value={settings.emailNotificationRecipients}
                        onChange={(e) => setSettings({
                          ...settings,
                          emailNotificationRecipients: e.target.value
                        })}
                        placeholder="admin@example.com, manager@example.com"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving('emailNotificationRecipients')}
                          onClick={() => handleSaveSetting('emailNotificationRecipients', settings.emailNotificationRecipients)}
                        >
                          {isSaving('emailNotificationRecipients') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save Recipients
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SettingItem>
              
              <Separator />
              
              <SettingItem
                label="SMS Notifications"
                description="Receive text message alerts for new bookings"
                icon={Phone}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsNotifications" className="flex-1">
                      Enable SMS notifications
                    </Label>
                    <Switch
                      id="smsNotifications"
                      checked={settings.enableSmsNotifications}
                      onCheckedChange={(checked) => {
                        setSettings({
                          ...settings,
                          enableSmsNotifications: checked
                        });
                        handleSaveSetting('enableSmsNotifications', checked);
                      }}
                    />
                  </div>
                  
                  {settings.enableSmsNotifications && (
                    <div className="space-y-2">
                      <Label htmlFor="smsNumber">Phone number for notifications</Label>
                      <Input
                        id="smsNumber"
                        type="tel"
                        value={settings.smsNotificationNumber}
                        onChange={(e) => setSettings({
                          ...settings,
                          smsNotificationNumber: e.target.value
                        })}
                        placeholder="(555) 123-4567"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving('smsNotificationNumber')}
                          onClick={() => handleSaveSetting('smsNotificationNumber', settings.smsNotificationNumber)}
                        >
                          {isSaving('smsNotificationNumber') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save Number
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SettingItem>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pricing Settings */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Pricing Settings
              </CardTitle>
              <CardDescription>Configure tax rates and pricing options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingItem
                label="Tax Rate"
                description="Sales tax percentage applied to orders"
                icon={DollarSign}
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({
                      ...settings,
                      taxRate: Number(e.target.value)
                    })}
                    className="max-w-[100px]"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving('taxRate')}
                    onClick={() => handleSaveSetting('taxRate', settings.taxRate)}
                  >
                    {isSaving('taxRate') ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </SettingItem>
              
              <Separator />
              
              <SettingItem
                label="Pricing Version"
                description="Select active pricing model"
                icon={SettingsIcon}
              >
                <div className="space-y-2">
                  <select
                    value={settings.pricingVersionId}
                    onChange={(e) => setSettings({
                      ...settings,
                      pricingVersionId: e.target.value
                    })}
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    <option value="default">Default Pricing (2025)</option>
                    <option value="holiday2025">Holiday Special 2025</option>
                    <option value="summer2025">Summer Promotion 2025</option>
                  </select>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving('pricingVersionId')}
                      onClick={() => handleSaveSetting('pricingVersionId', settings.pricingVersionId)}
                    >
                      {isSaving('pricingVersionId') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update Pricing
                    </Button>
                  </div>
                </div>
              </SettingItem>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Display Settings */}
        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                Display Settings
              </CardTitle>
              <CardDescription>Configure website appearance and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <SettingItem
                  label="Enable Reviews"
                  description="Allow customers to leave reviews"
                  icon={MessageSquare}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm">Customer reviews</div>
                      <div className="text-xs text-muted-foreground">
                        {settings.enableReviews ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableReviews}
                      onCheckedChange={(checked) => {
                        setSettings({
                          ...settings,
                          enableReviews: checked
                        });
                        handleSaveSetting('enableReviews', checked);
                      }}
                    />
                  </div>
                </SettingItem>
                
                <SettingItem
                  label="Social Sharing"
                  description="Allow social media sharing"
                  icon={MessageSquare}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm">Social media buttons</div>
                      <div className="text-xs text-muted-foreground">
                        {settings.enableSocialSharing ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableSocialSharing}
                      onCheckedChange={(checked) => {
                        setSettings({
                          ...settings,
                          enableSocialSharing: checked
                        });
                        handleSaveSetting('enableSocialSharing', checked);
                      }}
                    />
                  </div>
                </SettingItem>
              </div>
              
              <Separator />
              
              <SettingItem
                label="Custom CSS"
                description="Add custom styling to your website"
                icon={SettingsIcon}
              >
                <div className="space-y-2">
                  <Textarea
                    value={settings.customCss}
                    onChange={(e) => setSettings({
                      ...settings,
                      customCss: e.target.value
                    })}
                    placeholder=".my-custom-class { color: blue; }"
                    className="font-mono text-sm"
                    rows={6}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving('customCss')}
                      onClick={() => handleSaveSetting('customCss', settings.customCss)}
                    >
                      {isSaving('customCss') ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save CSS
                    </Button>
                  </div>
                </div>
              </SettingItem>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Be careful! These settings can significantly impact your website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingItem
                label="Maintenance Mode"
                description="Temporarily disable booking and display maintenance message"
                icon={AlertCircle}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">
                      {settings.maintenanceMode ? 'Site is under maintenance' : 'Site is live'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {settings.maintenanceMode 
                        ? 'Visitors cannot book appointments' 
                        : 'Booking system is active'}
                    </div>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        maintenanceMode: checked
                      });
                      handleSaveSetting('maintenanceMode', checked);
                    }}
                  />
                </div>
              </SettingItem>
              
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mt-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      About Advanced Settings
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Changes to these settings take effect immediately. Enabling maintenance mode will prevent customers from making new bookings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 flex flex-col items-start space-y-2 sm:flex-row sm:justify-between sm:space-x-0 text-sm">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => {
                  toast({
                    title: "Settings Exported",
                    description: "System settings have been exported to the console.",
                  });
                  console.log("System Settings:", settings);
                }}
              >
                Export Settings (Debug)
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for individual settings
function SettingItem({ 
  children, 
  label, 
  description, 
  icon: Icon 
}: { 
  children: React.ReactNode; 
  label: string; 
  description: string; 
  icon: React.ElementType 
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start space-x-3 mb-3">
        {Icon && <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />}
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}