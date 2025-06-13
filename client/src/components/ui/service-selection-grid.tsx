import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Icons } from "../icons";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";
import { motion } from "framer-motion";
import { ServiceCardSkeleton } from "./skeleton";
import { SimpleTVForm } from "./simple-tv-form";

interface Service {
  type: "tv" | "smartHome" | "deinstallation";
  title: string;
  description: string;
  basePrice: number;
  isMostPopular?: boolean;
}

interface ServiceGridProps {
  onServiceAdd: (
    type: "tv" | "smartHome" | "deinstallation",
    service: any
  ) => void;
  services: Service[];
  className?: string;
  isLoading?: boolean;
}

// Service Card Component
function ServiceCard({
  title,
  description,
  icon,
  price,
  isMostPopular = false,
  onClick,
  className
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  price: number;
  isMostPopular?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all hover:shadow-lg border-2 hover:border-blue-300",
        isMostPopular && "border-blue-500 bg-blue-50",
        className
      )}
      onClick={onClick}
    >
      {isMostPopular && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-blue-600">${price}</span>
          <Button size="sm" className="ml-2">
            Add Service
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ServiceSelectionGrid({
  onServiceAdd,
  services,
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
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-center">Select Your Services</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as "tv" | "smartHome" | "deinstallation")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tv" className="flex items-center gap-2">
              <Icons.tv className="h-4 w-4" />
              TV Install
            </TabsTrigger>
            <TabsTrigger value="deinstallation" className="flex items-center gap-2">
              <Icons.tvUnmount className="h-4 w-4" />
              TV Removal
            </TabsTrigger>
            <TabsTrigger value="smartHome" className="flex items-center gap-2">
              <Icons.home className="h-4 w-4" />
              Smart Home
            </TabsTrigger>
          </TabsList>

          {/* TV Installation Tab */}
          <TabsContent value="tv" className="mt-4">
            <ScrollArea className="h-[400px] pr-2">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  <ServiceCardSkeleton />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">TV Installation Service</h4>
                    <p className="text-sm text-blue-700 line-clamp-2">Professional TV mounting with complete setup, wire concealment, and 1-year warranty</p>
                  </div>
                  
                  <SimpleTVForm onServiceAdd={(service) => onServiceAdd("tv", service)} />
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">What's Included:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Professional wall mounting</li>
                      <li>• Wire concealment and cable management</li>
                      <li>• TV setup and testing</li>
                      <li>• Bracket and hardware included</li>
                      <li>• 1-year mounting warranty</li>
                    </ul>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TV De-Installation Tab */}
          <TabsContent value="deinstallation" className="mt-4">
            <ScrollArea className="h-[300px] pr-2">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  <ServiceCardSkeleton />
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  <motion.div variants={itemVariants}>
                    <ServiceCard
                      title="TV De-Installation"
                      description="Safe removal of mounted TV and bracket, includes cable cleanup"
                      icon={<Icons.tvUnmount className="h-6 w-6" />}
                      price={50}
                      onClick={() => onServiceAdd("deinstallation", {
                        type: "deinstallation",
                        tvSize: "small",
                        wallType: "standard",
                        cableCleanup: true,
                        basePrice: 50
                      })}
                    />
                  </motion.div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">What's Included:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Safe TV removal from wall mount</li>
                      <li>• Complete bracket and hardware removal</li>
                      <li>• Cable management and cleanup</li>
                      <li>• Wall restoration (filling mounting holes)</li>
                      <li>• Disposal of old mounting hardware</li>
                    </ul>
                    <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-600">
                      <strong>Flat Rate:</strong> $50 per TV regardless of size or wall type
                    </div>
                  </div>
                </motion.div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Smart Home Tab */}
          <TabsContent value="smartHome" className="mt-4">
            <ScrollArea className="h-[400px] pr-2">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ServiceCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-800 mb-2">Smart Home Installation</h4>
                    <p className="text-sm text-purple-700 line-clamp-2">Professional installation of smart home devices with complete setup, configuration, and app integration</p>
                  </div>
                  
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <motion.div variants={itemVariants}>
                      <ServiceCard
                        title="Smart Doorbell"
                        description="Professional doorbell installation with wiring and app setup"
                        icon={<Icons.doorbell className="h-6 w-6" />}
                        price={149}
                        onClick={() => onServiceAdd("smartHome", {
                          id: `doorbell-${Date.now()}`,
                          type: "doorbell",
                          count: 1,
                          hasExistingWiring: false,
                          basePrice: 149
                        })}
                      />
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                      <ServiceCard
                        title="Security Camera"
                        description="Professional camera installation with mounting and configuration"
                        icon={<Icons.camera className="h-6 w-6" />}
                        price={199}
                        onClick={() => onServiceAdd("smartHome", {
                          id: `camera-${Date.now()}`,
                          type: "camera",
                          count: 1,
                          hasExistingWiring: false,
                          basePrice: 199
                        })}
                      />
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="sm:col-span-2">
                      <ServiceCard
                        title="Smart Floodlight"
                        description="Motion-activated floodlight with app control and scheduling"
                        icon={<Icons.lighting className="h-6 w-6" />}
                        price={249}
                        onClick={() => onServiceAdd("smartHome", {
                          id: `floodlight-${Date.now()}`,
                          type: "floodlight",
                          count: 1,
                          hasExistingWiring: false,
                          basePrice: 249
                        })}
                      />
                    </motion.div>
                  </motion.div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}