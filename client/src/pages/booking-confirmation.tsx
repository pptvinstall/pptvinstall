import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";
import { CheckCircle, User, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/pricing";

export default function BookingConfirmation() {
  const queryParams = useQueryParams();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [formattedTime, setFormattedTime] = useState<string | null>(null);
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  // Track booking confirmation with Meta Pixel
  useEffect(() => {
    // Only fire the event when data is successfully loaded and not in error state
    if (bookingData && !loading && !error) {
      // Check if fbq is available (Meta Pixel is loaded)
      if (typeof window !== 'undefined' && (window as any).fbq) {
        // Track successful booking/schedule
        (window as any).fbq('track', 'Schedule');
        // Also track as a lead
        (window as any).fbq('track', 'Lead');
      }
    }
  }, [bookingData, loading, error]);
  
  // Account creation states
  const [showAccountForm, setShowAccountForm] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [accountCreating, setAccountCreating] = useState<boolean>(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // We're using useRef to track if we've already loaded the data
  // This will prevent the infinite update loop
  const hasLoadedDataRef = React.useRef(false);

  useEffect(() => {
    // Create a flag to prevent state updates if component unmounts
    let isActive = true;
    
    // Skip this effect if we've already loaded the data
    if (hasLoadedDataRef.current && bookingData !== null) {
      return;
    }
    
    // Mark that we're loading data
    hasLoadedDataRef.current = true;
    
    async function fetchData() {
      try {
        if (!isActive) return;
        
        // Get booking ID from URL or session storage
        const urlBookingId = queryParams.get("id");
        const storedBookingId = sessionStorage.getItem("bookingId");
        const rawAppointmentTime = sessionStorage.getItem("appointmentTime");
        const rawBookingDate = sessionStorage.getItem("rawBookingDate");

        // Use either URL booking ID or stored booking ID
        const bookingId = urlBookingId || storedBookingId;

        console.log("Booking confirmation - URL params:", {
          urlBookingId,
          storedBookingId,
          rawAppointmentTime,
          rawBookingDate,
          hasStoredData: sessionStorage.getItem("bookingData") !== null
        });

        // Get booking data from session storage
        const storedData = sessionStorage.getItem("bookingData");
        console.log("Session storage booking data:", storedData);

        let data = null;

        if (storedData) {
          try {
            data = JSON.parse(storedData);
            console.log("Successfully parsed booking data from session storage");
          } catch (e) {
            console.error("Error parsing booking data from session storage:", e);
          }
        }

        // If no data from session storage, try fetching from API
        if (!data && bookingId) {
          try {
            const response = await fetch(`/api/booking/${bookingId}`);
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.booking) {
                data = result.booking;
                console.log("Successfully fetched booking data from API");
              }
            }
          } catch (e) {
            console.error("Error fetching booking data from API:", e);
          }
        }

        // Get appointment time from session storage if needed
        if (rawAppointmentTime && data && !data.appointmentTime) {
          console.log("Retrieved raw appointment time from session:", rawAppointmentTime);
          data.appointmentTime = rawAppointmentTime;
        }

        // Check if component is still mounted before updating state
        if (!isActive) return;
        
        // Set the booking data
        console.log("Final booking data being used:", data);
        setBookingData(data);

        // Store these values instead of setting state within the same effect
        let formattedTimeValue = null;
        let formattedDateValue = null;

        // Format time if available - USE THE RAW TIME STRING WITHOUT CONVERSION
        if (data?.appointmentTime) {
          formattedTimeValue = data.appointmentTime;
        }

        // Format date if available - USE THE RAW DATE STRING WITHOUT CONVERSION
        if (data?.preferredDate) {
          try {
            // If we have rawBookingDate from session storage, prioritize using that
            if (rawBookingDate) {
              console.log("Using raw booking date from session storage:", rawBookingDate);
              // Format it directly without any timezone conversion
              const dateParts = rawBookingDate.split('T')[0].split('-');
              if (dateParts.length === 3) {
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1; // Months are 0-indexed in JS Date
                const day = parseInt(dateParts[2]);

                // Create the date with the exact components to avoid timezone issues
                const date = new Date(year, month, day);
                formattedDateValue = format(date, "EEEE, MMMM d, yyyy");
              } else {
                formattedDateValue = rawBookingDate;
              }
            } else {
              // Make sure we use the rawPreferredDate if available to avoid timezone issues
              // Use parseISO which is more reliable with timezone handling
              const date = parseISO(data.preferredDate);
              formattedDateValue = format(date, "EEEE, MMMM d, yyyy");
            }
          } catch (e) {
            console.error("Error formatting date:", e);
            formattedDateValue = "Date not available";
          }
        }
        
        // Only update these states if component is still mounted
        if (isActive) {
          setFormattedTime(formattedTimeValue);
          setFormattedDate(formattedDateValue);
          setLoading(false);
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Error in booking confirmation:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setLoading(false);
      }
    }

    fetchData();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isActive = false;
    };
  }, [queryParams]); // Only depend on queryParams, not loading

  // Define interfaces for service breakdown
  interface ServiceItem {
    name: string;
    details?: string[];
    price?: number;
  }

  interface ServiceCategory {
    category: string;
    items: ServiceItem[];
  }

  interface PricingBreakdownItem {
    type: string;
    size?: string;
    location?: string;
    mountType?: string;
    masonryWall?: boolean;
    highRise?: boolean;
    outletRelocation?: boolean;
    isUnmountOnly?: boolean;
    isRemountOnly?: boolean;
    brickInstallation?: boolean;
    mountHeight?: number;
  }

  // Process breakdown based on stored pricingBreakdown or fall back to serviceType text
  const processServiceBreakdown = (): ServiceCategory[] => {
    if (!bookingData) return [];

    // If we have detailed pricingBreakdown, use that
    if (bookingData.pricingBreakdown && Array.isArray(bookingData.pricingBreakdown)) {
      const breakdown: ServiceCategory[] = [];

      // Process TV installations
      const tvItems = bookingData.pricingBreakdown.filter((item: PricingBreakdownItem) =>
        item.type === 'tv' && !item.isUnmountOnly && !item.isRemountOnly
      );

      if (tvItems.length > 0) {
        breakdown.push({
          category: 'TV Mounting',
          items: tvItems.map((tv: PricingBreakdownItem, index: number) => ({
            name: `TV ${index + 1}: ${tv.size === 'large' ? '56" or larger' : '32"-55"'} - ${tv.location}`,
            details: [
              tv.mountType && ['fixed', 'tilting', 'full_motion'].includes(tv.mountType) ? 
                `With ${tv.mountType === 'fixed' ? 'Fixed' : tv.mountType === 'tilting' ? 'Tilting' : 'Full Motion'} Mount (${tv.size === 'large' ? '56"+' : '32"-55"'})` : null,
              tv.masonryWall ? 'Non-Drywall Surface' : null,
              tv.highRise ? 'High-Rise/Steel Studs' : null,
              tv.outletRelocation ? 'With Outlet Installation' : null
            ].filter(Boolean) as string[]
          }))
        });
      }

      // Process TV unmounting only services
      const unmountOnlyItems = bookingData.pricingBreakdown.filter((item: PricingBreakdownItem) => item.isUnmountOnly);
      if (unmountOnlyItems.length > 0) {
        breakdown.push({
          category: 'TV Unmounting',
          items: [{
            name: unmountOnlyItems.length > 1 ? `TV Unmounting Only (${unmountOnlyItems.length})` : 'TV Unmounting Only',
            details: []
          }]
        });
      }

      // Process TV remounting only services
      const remountOnlyItems = bookingData.pricingBreakdown.filter((item: PricingBreakdownItem) => item.isRemountOnly);
      if (remountOnlyItems.length > 0) {
        breakdown.push({
          category: 'TV Remounting',
          items: [{
            name: remountOnlyItems.length > 1 ? `TV Remounting Only (${remountOnlyItems.length})` : 'TV Remounting Only',
            details: []
          }]
        });
      }

      // Process Smart Home devices
      const smartHomeItems = bookingData.pricingBreakdown.filter((item: PricingBreakdownItem) =>
        item.type === 'doorbell' || item.type === 'camera' || item.type === 'floodlight'
      );

      if (smartHomeItems.length > 0) {
        breakdown.push({
          category: 'Smart Home',
          items: smartHomeItems.map((item: PricingBreakdownItem) => {
            const deviceName =
              item.type === 'doorbell' ? 'Smart Doorbell' :
                item.type === 'floodlight' ? 'Smart Floodlight' : 'Smart Camera';

            return {
              name: `${deviceName}${(item as any).quantity > 1 ? ` (×${(item as any).quantity})` : ''}`,
              details: [
                item.type === 'camera' && item.mountHeight && item.mountHeight > 8 ? `at ${item.mountHeight}ft` : null,
                item.type === 'doorbell' && item.brickInstallation ? 'on Brick' : null
              ].filter(Boolean) as string[]
            };
          })
        });
      }

      return breakdown;
    }

    // Fallback: Parse from serviceType string
    const serviceTypeBreakdown: ServiceCategory[] = [];

    if (bookingData.serviceType) {
      // Split by semicolons for major categories, then by commas for individual items
      const serviceCategories = bookingData.serviceType.split(';');

      serviceCategories.forEach((category: string) => {
        const trimmedCategory = category.trim();
        if (!trimmedCategory) return;

        const items = [];

        // Check if this is a TV unmounting only service
        if (trimmedCategory.includes('TV Unmounting Only')) {
          serviceTypeBreakdown.push({
            category: 'TV Unmounting',
            items: [{
              name: trimmedCategory,
              details: []
            }]
          });
        }
        // Check if this is a TV remounting only service
        else if (trimmedCategory.includes('TV Remounting Only')) {
          serviceTypeBreakdown.push({
            category: 'TV Remounting',
            items: [{
              name: trimmedCategory,
              details: []
            }]
          });
        }
        // Check if this is a TV category
        else if (trimmedCategory.includes('TV')) {
          serviceTypeBreakdown.push({
            category: 'TV Mounting',
            items: [{
              name: trimmedCategory,
              details: []
            }]
          });
        }
        // Check if this is a smart home category
        else if (trimmedCategory.includes('Smart') ||
          trimmedCategory.includes('Camera') ||
          trimmedCategory.includes('Doorbell') ||
          trimmedCategory.includes('Floodlight')) {
          serviceTypeBreakdown.push({
            category: 'Smart Home',
            items: [{
              name: trimmedCategory,
              details: []
            }]
          });
        }
        // Other service
        else {
          serviceTypeBreakdown.push({
            category: 'Additional Services',
            items: [{
              name: trimmedCategory,
              details: []
            }]
          });
        }
      });

      return serviceTypeBreakdown;
    }

    return [];
  };

  // Account creation handler
  const handleCreateAccount = async () => {
    // Reset error state
    setAccountError(null);
    
    // Basic validation
    if (password.length < 6) {
      setAccountError("Password must be at least 6 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      setAccountError("Passwords do not match");
      return;
    }
    
    if (!termsAccepted) {
      setAccountError("You must accept the terms and conditions");
      return;
    }
    
    // Start loading
    setAccountCreating(true);
    
    // Log account creation data for debugging (except password)
    console.log("Creating account with data:", {
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      streetAddress: bookingData.streetAddress,
      addressLine2: bookingData.addressLine2 || "",
      city: bookingData.city,
      state: bookingData.state,
      zipCode: bookingData.zipCode,
      passwordLength: password.length
    });
    
    try {
      // Format phone number by removing non-digit characters
      const cleanedPhone = bookingData.phone.replace(/\D/g, '');
      
      // Create the account with the customer's email and password
      // Ensure email is lowercase for consistency
      const normalizedEmail = bookingData.email.toLowerCase().trim();
      
      const response = await fetch("/api/customers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: bookingData.name,
          email: normalizedEmail, // Use lowercase email
          phone: cleanedPhone, // Use cleaned phone number
          password: password,
          streetAddress: bookingData.streetAddress,
          addressLine2: bookingData.addressLine2 || "",
          city: bookingData.city,
          state: bookingData.state,
          zipCode: bookingData.zipCode,
          consentToContact: true
        }),
      });
      
      const data = await response.json();
      console.log("Account creation response:", {
        status: response.status,
        success: data.success,
        message: data.message
      });
      
      if (response.ok && data.success) {
        toast({
          title: "Account created successfully!",
          description: "You can now log in to view your bookings and manage your account.",
        });
        
        // Store the email in session storage to prefill the login form
        sessionStorage.setItem("loginEmail", normalizedEmail);
        
        // Redirect to login page after account creation
        setTimeout(() => {
          navigate("/customer-login");
        }, 2000);
      } else {
        // Handle error
        setAccountError(data.message || "Failed to create account. Please try again.");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      setAccountError("An unexpected error occurred. Please try again.");
    } finally {
      setAccountCreating(false);
    }
  };

  // Calculate total price from the breakdown and actual price data
  const calculateTotalPrice = () => {
    // If we have the exact price from the booking data, use that
    if (bookingData?.pricingTotal) {
      return formatPrice(bookingData.pricingTotal);
    }

    // Fallback: estimate based on service type
    return estimatePriceFromServiceType(bookingData?.serviceType || '');
  };

  // Fallback: Estimate price from service type string
  const estimatePriceFromServiceType = (serviceType: string) => {
    if (!serviceType) return "$0";

    let totalPrice = 0;

    // TV mounting prices
    const tvMatches = serviceType.match(/TV \d+:/g) || [];

    tvMatches.forEach(tvMatch => {
      // Get index from the tvMatch (e.g., "TV 1:" -> 1)
      const tvIndex = parseInt(tvMatch.match(/\d+/)?.[0] || "1");

      // Check this specific TV's properties
      const tvSection = serviceType.split(';')[0]; // Assume TVs are in the first section

      // Extract properties for this specific TV
      const tvProperties = tvSection.split(',')
        .find(part => part.includes(`TV ${tvIndex}:`)) || '';

      // Base price
      let tvPrice = 100; // Default standard TV mount

      if (tvProperties.includes('fireplace')) {
        tvPrice = 200; // Fireplace installation
      } else if (tvProperties.includes('ceiling')) {
        tvPrice = 175; // Ceiling mount
      }

      // Add-ons
      if (tvProperties.includes('non-drywall') || tvProperties.includes('masonry')) {
        tvPrice += 50;
      }

      if (tvProperties.includes('high-rise') || tvProperties.includes('steel studs')) {
        tvPrice += 25;
      }

      if (tvProperties.includes('outlet')) {
        tvPrice += 100;
      }
      
      // Add mount prices if applicable
      if (tvProperties.includes('fixed mount')) {
        const isLarge = tvProperties.includes('56"') || tvProperties.includes('large');
        tvPrice += isLarge ? 65 : 50; // Fixed mount prices
      } else if (tvProperties.includes('tilting mount')) {
        const isLarge = tvProperties.includes('56"') || tvProperties.includes('large');
        tvPrice += isLarge ? 80 : 65; // Tilting mount prices
      } else if (tvProperties.includes('full motion mount')) {
        const isLarge = tvProperties.includes('56"') || tvProperties.includes('large');
        tvPrice += isLarge ? 120 : 90; // Full motion mount prices
      }

      totalPrice += tvPrice;
    });

    // TV unmounting only service
    if (serviceType.includes('TV Unmounting Only')) {
      // Check for quantity in parentheses
      const unmountQuantityMatch = serviceType.match(/TV Unmounting Only \((\d+) TVs\)/);
      const unmountQuantity = unmountQuantityMatch ? parseInt(unmountQuantityMatch[1]) : 1;

      totalPrice += unmountQuantity * 50; // $50 per TV for unmounting only
    }

    // TV remounting only service
    if (serviceType.includes('TV Remounting Only')) {
      // Check for quantity in parentheses
      const remountQuantityMatch = serviceType.match(/TV Remounting Only \((\d+) TVs\)/);
      const remountQuantity = remountQuantityMatch ? parseInt(remountQuantityMatch[1]) : 1;

      totalPrice += remountQuantity * 50; // $50 per TV for remounting only
    }

    // Smart doorbell
    const doorbellMatches = serviceType.match(/Smart Doorbell/g) || [];
    if (doorbellMatches.length > 0) {
      // Extract quantity if it exists
      const doorbellSection = serviceType.split(';')
        .find(section => section.includes('Smart Doorbell')) || '';

      const quantityMatch = doorbellSection.match(/\(×(\d+)\)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      // Use correct price from pricing data
      let doorbellPrice = 85 * quantity;

      // No additional charge for brick installation (included in base price)
      totalPrice += doorbellPrice;
    }

    // Smart floodlight
    const floodlightMatches = serviceType.match(/Smart Floodlight/g) || [];
    if (floodlightMatches.length > 0) {
      const floodlightSection = serviceType.split(';')
        .find(section => section.includes('Smart Floodlight')) || '';

      const quantityMatch = floodlightSection.match(/\(×(\d+)\)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      // Use correct price from pricing data
      totalPrice += 125 * quantity;
    }

    // Smart camera
    const cameraMatches = serviceType.match(/Smart Camera/g) || [];
    if (cameraMatches.length > 0) {
      const cameraSection = serviceType.split(';')
        .find(section => section.includes('Smart Camera')) || '';

      const quantityMatch = cameraSection.match(/\(×(\d+)\)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      // Use correct price from pricing data
      let cameraPrice = 75 * quantity;

      // No additional height surcharge (included in base price)
      totalPrice += cameraPrice;
    }



    return formatPrice(totalPrice);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-pulse flex flex-col items-center space-y-4">
              <div className="h-12 w-12 bg-muted rounded-full"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="h-4 w-48 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <p className="text-center mb-6">
              {error ? error.message : "We couldn't find the booking details. The booking may have been expired or deleted."}
            </p>
            <Button asChild>
              <Link href="/booking">Book a New Appointment</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the service breakdown
  const serviceBreakdown = processServiceBreakdown();

  return (
    <div className="container mx-auto py-8 px-4 md:px-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl">Booking Confirmed!</CardTitle>
          <CardDescription className="text-md md:text-lg">
            Your appointment has been booked successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Booking Reference ID */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground text-sm">Booking Reference ID</p>
            <p className="text-xl font-semibold">{bookingData.id || "N/A"}</p>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appointment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col p-4 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground text-sm">Date</span>
                <span className="font-medium">{formattedDate || "Not specified"}</span>
              </div>
              
              <div className="flex flex-col p-4 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground text-sm">Time</span>
                <span className="font-medium">{formattedTime || "Not specified"}</span>
              </div>
            </div>

            <div className="flex flex-col p-4 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground text-sm">Address</span>
              <span className="font-medium">
                {bookingData.streetAddress}
                {bookingData.addressLine2 && `, ${bookingData.addressLine2}`}
              </span>
              <span className="font-medium">
                {bookingData.city}, {bookingData.state} {bookingData.zipCode}
              </span>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Services</h3>
            
            <div className="divide-y">
              {serviceBreakdown.length > 0 ? (
                serviceBreakdown.map((category: ServiceCategory, index: number) => (
                  <div key={index} className="py-3">
                    <h4 className="font-medium text-primary">{category.category}</h4>
                    <div className="space-y-2 mt-2">
                      {category.items.map((item: ServiceItem, itemIndex: number) => (
                        <div key={itemIndex} className="text-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="font-medium">{item.name}</span>
                              {item.details && item.details.length > 0 && (
                                <ul className="list-disc list-inside pl-4 text-muted-foreground text-xs mt-1">
                                  {item.details.map((detail, detailIndex) => (
                                    <li key={detailIndex}>{detail}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {item.price !== undefined && (
                              <span className="font-medium">{formatPrice(item.price)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-3">
                  <p className="text-muted-foreground">
                    {bookingData.serviceType || "Service details not available"}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-semibold">Total Price</span>
              <span className="text-xl font-bold">{calculateTotalPrice()}</span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Next Steps</h3>
            <p className="text-muted-foreground text-sm">
              You'll receive a confirmation email shortly with your booking details and a calendar attachment. 
              Our team will contact you before your appointment to confirm all details.
            </p>
            {bookingData.notes && (
              <>
                <h4 className="font-medium">Your Notes</h4>
                <p className="text-sm italic">"{bookingData.notes}"</p>
              </>
            )}
          </div>

          {/* Create Account Section */}
          <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Create an Account</h3>
            </div>
            
            {showAccountForm ? (
              <div className="space-y-4">
                {accountError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{accountError}</AlertDescription>
                  </Alert>
                )}
                
                <p className="text-sm">
                  Create an account to easily track your bookings and schedule future services.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={bookingData.email} 
                      readOnly 
                      disabled 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must be at least 6 characters long
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password" 
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    />
                    <Label 
                      htmlFor="terms" 
                      className="text-sm font-normal"
                    >
                      I agree to the terms and conditions
                    </Label>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      onClick={handleCreateAccount} 
                      disabled={accountCreating}
                    >
                      {accountCreating ? "Creating Account..." : "Create Account"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAccountForm(false)}
                      disabled={accountCreating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-4">
                  Would you like to create an account using your email <strong>{bookingData.email}</strong>? Having an account lets you easily track your bookings and schedule future services.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => setShowAccountForm(true)}>
                    Create Account
                  </Button>
                  <Button 
                    variant="outline" 
                    asChild
                  >
                    <Link href="/customer-login">I Already Have an Account</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild variant="outline">
              <Link href="/">Return to Home</Link>
            </Button>
            <Button asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}