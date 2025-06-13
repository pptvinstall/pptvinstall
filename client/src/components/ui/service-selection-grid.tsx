
import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Icons } from "../icons";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";
import { TVInstallation, SmartHomeInstallation } from "@/types/booking";
import { motion } from "framer-motion";
import { pricing } from "@/lib/pricing";
import { ServiceCardSkeleton } from "./skeleton";

interface TVDeinstallation {
  id: string;
  name: string;
  description: string;
  type: "deinstallation";
  basePrice: number;
  tvSize?: "small" | "large";
  wallType?: "standard" | "brick" | "highrise";
  cableCleanup?: boolean;
}

interface ServiceGridProps {
  onServiceSelect: (
    type: "tv" | "smartHome" | "deinstallation",
    service: TVInstallation | SmartHomeInstallation | TVDeinstallation
  ) => void;
  tvInstallations: TVInstallation[];
  smartHomeInstallations: SmartHomeInstallation[];
  tvDeinstallations?: TVDeinstallation[];
  className?: string;
  isLoading?: boolean;
}

export function ServiceSelectionGrid({
  onServiceSelect,
  tvInstallations,
  smartHomeInstallations,
  tvDeinstallations = [],
  className,
  isLoading = false,
}: ServiceGridProps) {
  const [activeTab, setActiveTab] = useState<"tv" | "smartHome" | "deinstallation">("tv");

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };
  
  // Function to get correct price from pricing.ts
  const getPriceForSmartHome = (type: string): number => {
    switch (type) {
      case "camera":
        return pricing.smartHome.securityCamera.price; // $75
      case "doorbell":
        return pricing.smartHome.doorbell.price; // $85
      case "floodlight":
        return pricing.smartHome.floodlight.price; // $125
      default:
        return 0;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-center sm:text-left">
          Select Your Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="tv"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "tv" | "smartHome" | "deinstallation")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tv" className="text-sm">
              <Icons.tv className="mr-2 h-4 w-4" />
              TV Install
            </TabsTrigger>
            <TabsTrigger value="deinstallation" className="text-sm">
              <Icons.tvUnmount className="mr-2 h-4 w-4" />
              TV Removal
            </TabsTrigger>
            <TabsTrigger value="smartHome" className="text-sm">
              <Icons.smartHome className="mr-2 h-4 w-4" />
              Smart Home
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tv" className="mt-0 relative">
            <div className="scroll-container">
              <ScrollArea className="h-[280px] pr-2 scroll-container">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <ServiceCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="service-selection-grid grid grid-cols-1 sm:grid-cols-2 gap-3 mx-auto w-full"
                  >
                    {tvInstallations.map((service) => (
                      <motion.div key={service.id} variants={itemVariants} className="w-full">
                        <ServiceCard
                          title={service.name}
                          description={service.description}
                          icon={<TVServiceIcon type={service.type} />}
                          price={service.basePrice}
                          isMostPopular={service.isMostPopular}
                          isPromoted={service.isPromoted}
                          onClick={() => onServiceSelect("tv", service)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="deinstallation" className="mt-0 relative">
            <div className="scroll-container">
              <ScrollArea className="h-[280px] pr-2 scroll-container">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <ServiceCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="service-selection-grid grid grid-cols-1 gap-4 mx-auto w-full"
                  >
                    <motion.div variants={itemVariants} className="w-full">
                      <ServiceCard
                        title="TV De-Installation"
                        description="Safe removal of mounted TV and bracket, includes cable cleanup. Can be booked by itself or with a new install."
                        icon={<Icons.tvUnmount className="h-6 w-6" />}
                        price={50}
                        onClick={() => onServiceSelect("deinstallation", {
                          id: "tv-deinstall-service",
                          name: "TV De-Installation",
                          description: "Professional TV and bracket removal with cable cleanup",
                          type: "deinstallation",
                          basePrice: 50
                        })}
                      />
                    </motion.div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">What's Included:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Safe TV removal from wall mount</li>
                        <li>• Complete bracket and hardware removal</li>
                        <li>• Cable management and cleanup</li>
                        <li>• Wall restoration (filling mounting holes)</li>
                        <li>• Disposal of old mounting hardware</li>
                      </ul>
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-600">
                        <strong>Flat Rate:</strong> $50 per TV regardless of size or wall type
                      </div>
                    </div>
                  </motion.div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="smartHome" className="mt-0 relative">
            <div className="scroll-container">
              <ScrollArea className="h-[280px] pr-2 scroll-container">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <ServiceCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="service-selection-grid grid grid-cols-1 sm:grid-cols-2 gap-3 mx-auto w-full"
                  >
                    {smartHomeInstallations.map((service) => {
                      // Get the correct price from pricing.ts file
                      const correctPrice = getPriceForSmartHome(service.type);
                      
                      return (
                        <motion.div key={service.id} variants={itemVariants} className="w-full">
                          <ServiceCard
                            title={service.name}
                            description={service.description}
                            icon={<SmartHomeServiceIcon type={service.type} />}
                            price={correctPrice}
                            onClick={() => {
                              // Create an updated service with the correct price
                              const updatedService = {
                                ...service,
                                basePrice: correctPrice
                              };
                              onServiceSelect("smartHome", updatedService);
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TVServiceIcon({ type }: { type: string }) {
  switch (type) {
    case "mount":
      return <Icons.tvMount className="h-6 w-6" />;
    case "unmount":
      return <Icons.tvUnmount className="h-6 w-6" />;
    case "deinstallation":
      return <Icons.tvUnmount className="h-6 w-6" />;
    case "remount":
      return <Icons.tvRemount className="h-6 w-6" />;
    case "outlet":
      return <Icons.outlet className="h-6 w-6" />;
    default:
      return <Icons.tv className="h-6 w-6" />;
  }
}

function SmartHomeServiceIcon({ type }: { type: string }) {
  switch (type) {
    case "camera":
      return <Icons.camera className="h-6 w-6" />;
    case "doorbell":
      return <Icons.doorbell className="h-6 w-6" />;
    case "lighting":
      return <Icons.lighting className="h-6 w-6" />;
    default:
      return <Icons.smartHome className="h-6 w-6" />;
  }
}

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  price: number;
  onClick: () => void;
  isMostPopular?: boolean;
  isPromoted?: boolean;
}

function ServiceCard({
  title,
  description,
  icon,
  price,
  onClick,
  isMostPopular,
  isPromoted
}: ServiceCardProps) {
  return (
    <button
      className="w-full text-left focus:outline-none"
      onClick={onClick}
    >
      <Card className={`w-full h-full transition-all hover:bg-primary/5 hover:border-primary/30 hover:shadow-md relative ${isMostPopular ? 'border-2 border-blue-500 shadow-md' : isPromoted ? 'border-blue-300' : ''}`}>
        {isMostPopular && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1 font-medium z-10">
            Most Popular
          </div>
        )}
        {isPromoted && !isMostPopular && (
          <div className="absolute -top-2 -right-2 bg-blue-400 text-white text-xs rounded-full px-2 py-1 font-medium z-10">
            Featured
          </div>
        )}
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start">
            <div className={`mr-3 mt-1 p-1.5 rounded-full ${isMostPopular ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}`}>
              {icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-medium ${isMostPopular ? 'text-blue-700' : ''}`}>{title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {description}
              </p>
            </div>
          </div>
          <div className="mt-auto pt-2 text-right">
            <span className={`font-semibold ${isMostPopular ? 'text-blue-600 text-lg' : 'text-primary'}`}>${price}</span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
