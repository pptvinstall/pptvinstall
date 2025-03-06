import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryParams } from "@/hooks/use-query-params";
import { CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/pricing";

export default function BookingConfirmation() {
  const queryParams = useQueryParams();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [formattedTime, setFormattedTime] = useState<string | null>(null);
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

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

        // Set the booking data
        console.log("Final booking data being used:", data);
        setBookingData(data);

        // Format time if available - USE THE RAW TIME STRING WITHOUT CONVERSION
        if (data?.appointmentTime) {
          setFormattedTime(data.appointmentTime);
        }

        // Format date if available - USE THE RAW DATE STRING WITHOUT CONVERSION
        if (data?.preferredDate) {
          try {
            // If we have rawBookingDate from session storage, prioritize using that
            if (rawBookingDate) {
              console.log("Using raw booking date from session storage:", rawBookingDate);
              // Format it directly without any timezone conversion
              const dateParts = rawBookingDate.split('-');
              if (dateParts.length === 3) {
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1; // Months are 0-indexed in JS Date
                const day = parseInt(dateParts[2]);

                // Create the date with the exact components to avoid timezone issues
                const date = new Date(year, month, day);
                setFormattedDate(format(date, "EEEE, MMMM d, yyyy"));
              } else {
                setFormattedDate(rawBookingDate);
              }
            } else {
              // Make sure we use the rawPreferredDate if available to avoid timezone issues
              // Use parseISO which is more reliable with timezone handling
              const date = parseISO(data.preferredDate);
              setFormattedDate(format(date, "EEEE, MMMM d, yyyy"));
            }
          } catch (e) {
            console.error("Error formatting date:", e);
            setFormattedDate("Date not available");
          }
        }
      } catch (err) {
        console.error("Error in booking confirmation:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [queryParams]);

  // Process breakdown based on stored pricingBreakdown or fall back to serviceType text
  const processServiceBreakdown = () => {
    if (!bookingData) return [];

    // If we have detailed pricingBreakdown, use that
    if (bookingData.pricingBreakdown && Array.isArray(bookingData.pricingBreakdown)) {
      const breakdown = [];

      // Process TV installations
      const tvItems = bookingData.pricingBreakdown.filter(item => item.type === 'tv');
      if (tvItems.length > 0) {
        breakdown.push({
          category: 'TV Mounting',
          items: tvItems.map((tv, index) => ({
            name: `TV ${index + 1}: ${tv.size === 'large' ? '56" or larger' : '32"-55"'} - ${tv.location} ${tv.mountType !== 'none' ? `(${tv.mountType})` : ''}`,
            details: [
              tv.masonryWall ? 'Non-Drywall Surface' : null,
              tv.outletRelocation ? 'With Outlet Installation' : null
            ].filter(Boolean)
          }))
        });
      }

      // Process Smart Home devices
      const smartHomeItems = bookingData.pricingBreakdown.filter(item => 
        item.type === 'doorbell' || item.type === 'camera' || item.type === 'floodlight'
      );

      if (smartHomeItems.length > 0) {
        breakdown.push({
          category: 'Smart Home',
          items: smartHomeItems.map(item => {
            const deviceName = 
              item.type === 'doorbell' ? 'Smart Doorbell' : 
              item.type === 'floodlight' ? 'Smart Floodlight' : 'Smart Camera';

            return {
              name: `${deviceName}${item.quantity > 1 ? ` (×${item.quantity})` : ''}`,
              details: [
                item.type === 'camera' && item.mountHeight > 8 ? `at ${item.mountHeight}ft` : null,
                item.type === 'doorbell' && item.brickInstallation ? 'on Brick' : null
              ].filter(Boolean)
            };
          })
        });
      }

      return breakdown;
    }

    // Fallback: Parse from serviceType string
    const serviceTypeBreakdown = [];

    if (bookingData.serviceType) {
      // Split by semicolons for major categories, then by commas for individual items
      const serviceCategories = bookingData.serviceType.split(';');

      serviceCategories.forEach(category => {
        const trimmedCategory = category.trim();
        if (!trimmedCategory) return;

        const items = [];

        // Check if this is a TV category
        if (trimmedCategory.includes('TV')) {
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

      if (tvProperties.includes('outlet')) {
        tvPrice += 100;
      }

      totalPrice += tvPrice;
    });

    // Smart doorbell
    const doorbellMatches = serviceType.match(/Smart Doorbell/g) || [];
    if (doorbellMatches.length > 0) {
      // Extract quantity if it exists
      const doorbellSection = serviceType.split(';')
        .find(section => section.includes('Smart Doorbell')) || '';

      const quantityMatch = doorbellSection.match(/\(×(\d+)\)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      let doorbellPrice = 85 * quantity;

      // Check for brick installation
      if (doorbellSection.includes('Brick') || doorbellSection.includes('brick')) {
        doorbellPrice += 10 * quantity;
      }

      totalPrice += doorbellPrice;
    }

    // Smart floodlight
    const floodlightMatches = serviceType.match(/Smart Floodlight/g) || [];
    if (floodlightMatches.length > 0) {
      const floodlightSection = serviceType.split(';')
        .find(section => section.includes('Smart Floodlight')) || '';

      const quantityMatch = floodlightSection.match(/\(×(\d+)\)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      totalPrice += 125 * quantity;
    }

    // Smart camera
    const cameraMatches = serviceType.match(/Smart Camera/g) || [];
    if (cameraMatches.length > 0) {
      const cameraSection = serviceType.split(';')
        .find(section => section.includes('Smart Camera')) || '';

      const quantityMatch = cameraSection.match(/\(×(\d+)\)/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

      let cameraPrice = 75 * quantity;

      // Check for height surcharge
      const heightMatch = cameraSection.match(/at (\d+)ft/);
      if (heightMatch && parseInt(heightMatch[1]) > 8) {
        const height = parseInt(heightMatch[1]);
        const surcharge = Math.ceil((height - 8) / 4) * 25;
        cameraPrice += surcharge * quantity;
      }

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
            <CardTitle className="text-center text-2xl">Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
            <p className="text-center text-muted-foreground">
              We couldn't find your booking information. Please try again or contact us for assistance.
            </p>
            <Button variant="default" asChild>
              <Link to="/">Return to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serviceBreakdown = processServiceBreakdown();
  const totalPrice = calculateTotalPrice();

  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-green-50 dark:bg-green-950 border-b">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl">Booking Confirmed!</CardTitle>
          <CardDescription className="text-center text-lg">
            Thank you for choosing Picture Perfect TV Install
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Service Breakdown */}
          <div className="space-y-6">
            <h3 className="font-medium text-lg">Service Details</h3>

            {serviceBreakdown.length > 0 ? (
              serviceBreakdown.map((category, index) => (
                <div key={index} className="space-y-3">
                  <h4 className="font-medium">{category.category}</h4>
                  <ul className="space-y-2">
                    {category.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="pl-4 relative before:content-['•'] before:absolute before:left-0">
                        <span>{item.name}</span>
                        {item.details && item.details.length > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({item.details.join(', ')})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {index < serviceBreakdown.length - 1 && <Separator className="my-3" />}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">{bookingData.serviceType || "No service details available"}</p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <h3 className="font-medium">Appointment Date</h3>
              <p className="text-muted-foreground">
                {formattedDate || "Date not available"}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Appointment Time</h3>
              <p className="text-muted-foreground">{formattedTime || "Time not available"}</p>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-medium">Customer Information</h3>
            <p className="text-muted-foreground">{bookingData.name}</p>
            <p className="text-muted-foreground">{bookingData.email}</p>
            <p className="text-muted-foreground">{bookingData.phone}</p>
          </div>

          <div className="space-y-1">
            <h3 className="font-medium">Address</h3>
            <p className="text-muted-foreground">{bookingData.streetAddress}</p>
            {bookingData.addressLine2 && (
              <p className="text-muted-foreground">{bookingData.addressLine2}</p>
            )}
            <p className="text-muted-foreground">
              {bookingData.city}, {bookingData.state} {bookingData.zipCode}
            </p>
          </div>

          {bookingData.notes && (
            <div className="space-y-1">
              <h3 className="font-medium">Additional Notes</h3>
              <p className="text-muted-foreground">{bookingData.notes}</p>
            </div>
          )}

          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-medium mb-2">Estimated Total</h3>
            <p className="text-xl font-bold">{totalPrice}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This is an estimate. Final price may vary based on additional services or special requirements.
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to {bookingData.email}. If you have any questions, 
              please contact us at (404) 702-4748.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}