import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, CheckCircle, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Service areas with zipcodes
const SERVICE_AREAS = {
  "Atlanta": [
    "30301", "30302", "30303", "30304", "30305", "30306", "30307", "30308", "30309", "30310",
    "30311", "30312", "30313", "30314", "30315", "30316", "30317", "30318", "30319", "30320",
    "30321", "30322", "30324", "30325", "30326", "30327", "30328", "30329", "30330", "30331",
    "30332", "30333", "30334", "30336", "30337", "30338", "30339", "30340", "30341", "30342",
    "30343", "30344", "30345", "30346", "30348", "30349", "30350", "30353", "30354", "30355",
    "30356", "30357", "30358", "30359", "30360", "30361", "30362", "30363", "30364", "30366",
    "30368", "30369", "30370", "30371", "30374", "30375", "30377", "30378", "30380", "30384",
    "30385", "30388", "30392", "30394", "30396", "30398", "31106", "31107", "31119", "31126",
    "31131", "31136", "31139", "31141", "31145", "31146", "31150", "31156", "31192", "31193",
    "31195", "31196", "39901"
  ],
  "Decatur": ["30030", "30031", "30032", "30033", "30034", "30035", "30036", "30037"],
  "Marietta": ["30060", "30061", "30062", "30063", "30064", "30065", "30066", "30067", "30068", "30069"],
  "Alpharetta": ["30004", "30005", "30009", "30022"],
  "Duluth": ["30095", "30096", "30097", "30098", "30099"],
  "Roswell": ["30075", "30076", "30077"],
  "Sandy Springs": ["30327", "30328", "30342", "30350", "30358", "30359", "30328"]
};

// Base travel fees (simplified for example)
const TRAVEL_FEES = {
  "ZONE_1": 0, // No fee within primary service zone
  "ZONE_2": 25, // $25 for nearby areas
  "ZONE_3": 50, // $50 for farther areas
  "NOT_SERVICEABLE": -1 // Not serviceable
};

// Check if zipcode is serviceable and calculate zone
const checkServiceArea = (zipcode: string): { serviceable: boolean, zone: string, city?: string, fee?: number } => {
  // Check primary service areas
  for (const [city, zipcodes] of Object.entries(SERVICE_AREAS)) {
    if (zipcodes.includes(zipcode)) {
      return { 
        serviceable: true, 
        zone: "ZONE_1", 
        city, 
        fee: TRAVEL_FEES.ZONE_1 
      };
    }
  }

  // Add logic for ZONE_2 and ZONE_3 based on proximity to primary areas
  // This would normally involve some distance calculation

  // For now, use a simple rule: consider certain zipcodes in ZONE_2/ZONE_3
  const zone2Zipcodes = ["30040", "30041", "30071", "30078", "30084"];
  const zone3Zipcodes = ["30114", "30115", "30188", "30189", "30102"];

  if (zone2Zipcodes.includes(zipcode)) {
    return { 
      serviceable: true, 
      zone: "ZONE_2", 
      fee: TRAVEL_FEES.ZONE_2 
    };
  }

  if (zone3Zipcodes.includes(zipcode)) {
    return { 
      serviceable: true, 
      zone: "ZONE_3", 
      fee: TRAVEL_FEES.ZONE_3 
    };
  }

  // Not serviceable
  return { 
    serviceable: false, 
    zone: "NOT_SERVICEABLE" 
  };
};

export default function ServiceAreaPage() {
  const [zipcode, setZipcode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    serviceable: boolean;
    zone?: string;
    city?: string;
    fee?: number;
  } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load the Google Maps API and initialize the map
  useEffect(() => {
    if (mapContainerRef.current) {
      // This would normally use the Google Maps API
      // Since we can't add a real map here, we'll show a placeholder

      // In a real implementation, you'd use something like:
      // const script = document.createElement("script");
      // script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap`;
      // document.body.appendChild(script);

      // Instead, set a background image placeholder
      mapContainerRef.current.style.backgroundImage = "url('/images/atlanta-map.jpg')";
      mapContainerRef.current.style.backgroundSize = "cover";
      mapContainerRef.current.style.backgroundPosition = "center";
    }
  }, []);

  const handleCheckZipcode = () => {
    if (!zipcode || zipcode.length !== 5) {
      toast({
        title: "Invalid zipcode",
        description: "Please enter a valid 5-digit zipcode",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);

    // Simulate API call with timeout
    setTimeout(() => {
      const serviceResult = checkServiceArea(zipcode);
      setResult(serviceResult);
      setIsChecking(false);
    }, 800);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-2">Service Area</h1>
      <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
        We offer our professional TV and smart home installation services throughout the greater Atlanta area.
        Check if your location is within our service area.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Our Service Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={mapContainerRef} 
                className="w-full h-[400px] bg-gray-200 rounded-md"
              >
                {/* Google Map would be loaded here */}
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <MapPin className="h-12 w-12 mb-2" />
                  <p>Service area map</p>
                  <p className="text-xs">(Map would display here in production)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(SERVICE_AREAS).map(([city, _]) => (
              <Card key={city}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-brand-blue-500" />
                    <h3 className="font-medium">{city}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Check Your Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="zipcode">Enter Your Zip Code</Label>
                  <div className="flex mt-1">
                    <Input
                      id="zipcode"
                      value={zipcode}
                      onChange={(e) => setZipcode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                      placeholder="e.g., 30305"
                      className="rounded-r-none"
                    />
                    <Button 
                      onClick={handleCheckZipcode} 
                      disabled={isChecking || zipcode.length !== 5}
                      className="rounded-l-none"
                    >
                      {isChecking ? "Checking..." : "Check"}
                    </Button>
                  </div>
                </div>

                {result && (
                  <div className={`p-4 rounded-md mt-4 ${
                    result.serviceable 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-red-50 border border-red-200"
                  }`}>
                    {result.serviceable ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">
                            Great news! We service your area.
                          </span>
                        </div>

                        {result.city && (
                          <p className="text-green-700">
                            {zipcode} is in our {result.city} service area.
                          </p>
                        )}

                        {result.fee !== undefined && result.fee > 0 && (
                          <div className="mt-2 p-2 bg-white rounded border border-green-200">
                            <p className="text-sm flex items-center gap-1">
                              <Info className="h-4 w-4" />
                              Travel fee: ${result.fee.toFixed(2)}
                            </p>
                          </div>
                        )}

                        <div className="pt-2">
                          <Button 
                            onClick={() => window.location.href = "/booking"}
                            className="w-full"
                          >
                            Book Now
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-red-800">
                            Sorry, we don't currently service this area.
                          </span>
                        </div>

                        <p className="text-red-700">
                          We're currently focusing on the greater Atlanta area.
                        </p>

                        <div className="pt-2">
                          <Button 
                            variant="outline"
                            onClick={() => window.location.href = "/contact"}
                            className="w-full"
                          >
                            Contact Us
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Travel Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Primary Service Area:</span>
                  <span className="font-medium text-green-600">No Fee</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Zone 2 Areas:</span>
                  <span className="font-medium">${TRAVEL_FEES.ZONE_2.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Zone 3 Areas:</span>
                  <span className="font-medium">${TRAVEL_FEES.ZONE_3.toFixed(2)}</span>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Travel fees are automatically added to your order total during checkout.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}