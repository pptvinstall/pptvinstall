import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Monitor, 
  MinusCircle, 
  Camera, 
  Settings2, 
  Plus, 
  Trash2,
  DollarSign,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Service Types
interface TVInstallationService {
  id: string;
  type: 'tv_installation';
  tvSize: 'small' | 'medium' | 'large' | 'extra_large';
  mountType: 'fixed' | 'tilting' | 'full_motion';
  location: 'standard_wall' | 'fireplace' | 'corner' | 'ceiling';
  addOns: {
    masonryWall: boolean;
    highRise: boolean;
    outletInstallation: boolean;
    cableManagement: boolean;
    soundbarMount: boolean;
  };
}

interface TVRemovalService {
  id: string;
  type: 'tv_removal';
  quantity: number;
  includePatching: boolean;
  includeRemount: boolean;
  notes: string;
}

interface SmartHomeService {
  id: string;
  type: 'smart_home';
  deviceType: 'security_camera' | 'video_doorbell' | 'floodlight_camera' | 'smart_switch' | 'other';
  quantity: number;
  location: 'indoor' | 'outdoor';
  addOns: {
    existingWiring: boolean;
    newWiring: boolean;
    weatherproofing: boolean;
  };
}

type Service = TVInstallationService | TVRemovalService | SmartHomeService;

// Comprehensive Pricing Matrix
const PRICING_MATRIX = {
  tv_installation: {
    base: {
      small: 150,      // Up to 55"
      medium: 175,     // 56"-70"  
      large: 200,      // 71"-85"
      extra_large: 250 // 86"+
    },
    mount_upgrades: {
      tilting: 25,
      full_motion: 50
    },
    location_fees: {
      fireplace: 75,
      corner: 35,
      ceiling: 100
    },
    addons: {
      masonryWall: 50,
      highRise: 25,
      outletInstallation: 75,
      cableManagement: 40,
      soundbarMount: 30
    }
  },
  tv_removal: {
    base: 50,           // Flat rate per TV
    addons: {
      includePatching: 25,
      includeRemount: 0  // No extra charge if part of installation
    }
  },
  smart_home: {
    base: {
      security_camera: 75,
      video_doorbell: 85,
      floodlight_camera: 95,
      smart_switch: 50,
      other: 65
    },
    location_multiplier: {
      indoor: 1.0,
      outdoor: 1.2
    },
    addons: {
      newWiring: 50,
      weatherproofing: 25
    }
  },
  atlanta_tax_rate: 0.08, // 8% Atlanta area tax
  service_fee: 15 // Flat service fee
};

// Service calculation functions
const calculateTVInstallationPrice = (service: TVInstallationService): number => {
  const basePrice = PRICING_MATRIX.tv_installation.base[service.tvSize];
  
  let total = basePrice;
  
  // Mount type upgrades
  if (service.mountType === 'tilting') {
    total += PRICING_MATRIX.tv_installation.mount_upgrades.tilting;
  } else if (service.mountType === 'full_motion') {
    total += PRICING_MATRIX.tv_installation.mount_upgrades.full_motion;
  }
  
  // Location fees
  if (service.location === 'fireplace') {
    total += PRICING_MATRIX.tv_installation.location_fees.fireplace;
  } else if (service.location === 'corner') {
    total += PRICING_MATRIX.tv_installation.location_fees.corner;
  } else if (service.location === 'ceiling') {
    total += PRICING_MATRIX.tv_installation.location_fees.ceiling;
  }
  
  // Add-ons
  Object.entries(service.addOns).forEach(([addon, enabled]) => {
    if (enabled && addon in PRICING_MATRIX.tv_installation.addons) {
      total += PRICING_MATRIX.tv_installation.addons[addon as keyof typeof PRICING_MATRIX.tv_installation.addons];
    }
  });
  
  return total;
};

const calculateTVRemovalPrice = (service: TVRemovalService): number => {
  let total = PRICING_MATRIX.tv_removal.base * service.quantity;
  
  if (service.includePatching) {
    total += PRICING_MATRIX.tv_removal.addons.includePatching * service.quantity;
  }
  
  return total;
};

const calculateSmartHomePrice = (service: SmartHomeService): number => {
  const basePrice = PRICING_MATRIX.smart_home.base[service.deviceType];
  const locationMultiplier = PRICING_MATRIX.smart_home.location_multiplier[service.location];
  
  let unitPrice = basePrice * locationMultiplier;
  
  // Add-ons per unit
  if (service.addOns.newWiring) {
    unitPrice += PRICING_MATRIX.smart_home.addons.newWiring;
  }
  if (service.addOns.weatherproofing && service.location === 'outdoor') {
    unitPrice += PRICING_MATRIX.smart_home.addons.weatherproofing;
  }
  
  return unitPrice * service.quantity;
};

const calculateServicePrice = (service: Service): number => {
  switch (service.type) {
    case 'tv_installation':
      return calculateTVInstallationPrice(service);
    case 'tv_removal':
      return calculateTVRemovalPrice(service);
    case 'smart_home':
      return calculateSmartHomePrice(service);
    default:
      return 0;
  }
};

export function SmartBookingWizard() {
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<'tv_install' | 'tv_removal' | 'smart_home'>('tv_install');

  // Calculate totals with tax and fees
  const subtotal = useMemo(() => {
    return services.reduce((total, service) => total + calculateServicePrice(service), 0);
  }, [services]);

  const tax = useMemo(() => {
    return subtotal * PRICING_MATRIX.atlanta_tax_rate;
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + tax + PRICING_MATRIX.service_fee;
  }, [subtotal, tax]);

  // Service management functions
  const addTVInstallationService = () => {
    const newService: TVInstallationService = {
      id: `tv-install-${Date.now()}`,
      type: 'tv_installation',
      tvSize: 'medium',
      mountType: 'fixed',
      location: 'standard_wall',
      addOns: {
        masonryWall: false,
        highRise: false,
        outletInstallation: false,
        cableManagement: false,
        soundbarMount: false
      }
    };
    setServices(prev => [...prev, newService]);
  };

  const addTVRemovalService = () => {
    const newService: TVRemovalService = {
      id: `tv-removal-${Date.now()}`,
      type: 'tv_removal',
      quantity: 1,
      includePatching: false,
      includeRemount: false,
      notes: ''
    };
    setServices(prev => [...prev, newService]);
  };

  const addSmartHomeService = () => {
    const newService: SmartHomeService = {
      id: `smart-home-${Date.now()}`,
      type: 'smart_home',
      deviceType: 'security_camera',
      quantity: 1,
      location: 'indoor',
      addOns: {
        existingWiring: true,
        newWiring: false,
        weatherproofing: false
      }
    };
    setServices(prev => [...prev, newService]);
  };

  const removeService = (serviceId: string) => {
    setServices(prev => prev.filter(service => service.id !== serviceId));
  };

  const updateService = <T extends Service>(serviceId: string, updates: Partial<T>) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId ? ({ ...service, ...updates } as Service) : service
    ));
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8">
              <CardTitle className="text-3xl font-bold">Smart Service Booking</CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                Select your services and see real-time pricing
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
                {/* Service Selection Panel */}
                <div className="lg:col-span-2 p-6 space-y-6">
                  {/* Service Category Tabs */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={activeTab === 'tv_install' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('tv_install')}
                      className="flex items-center gap-2"
                    >
                      <Monitor className="h-4 w-4" />
                      TV Installation
                    </Button>
                    <Button
                      variant={activeTab === 'tv_removal' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('tv_removal')}
                      className="flex items-center gap-2"
                    >
                      <MinusCircle className="h-4 w-4" />
                      TV Removal
                    </Button>
                    <Button
                      variant={activeTab === 'smart_home' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('smart_home')}
                      className="flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Smart Home
                    </Button>
                  </div>

                  {/* Add Service Buttons */}
                  <div className="flex gap-3">
                    {activeTab === 'tv_install' && (
                      <Button onClick={addTVInstallationService} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add TV Installation
                      </Button>
                    )}
                    {activeTab === 'tv_removal' && (
                      <Button onClick={addTVRemovalService} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add TV Removal
                      </Button>
                    )}
                    {activeTab === 'smart_home' && (
                      <Button onClick={addSmartHomeService} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Smart Home Device
                      </Button>
                    )}
                  </div>

                  {/* Selected Services Configuration */}
                  <div className="space-y-4">
                    <AnimatePresence>
                      {services
                        .filter(service => 
                          (activeTab === 'tv_install' && service.type === 'tv_installation') ||
                          (activeTab === 'tv_removal' && service.type === 'tv_removal') ||
                          (activeTab === 'smart_home' && service.type === 'smart_home')
                        )
                        .map((service) => (
                          <motion.div
                            key={service.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card className="border-l-4 border-l-blue-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-2">
                                    {service.type === 'tv_installation' && <Monitor className="h-5 w-5 text-blue-600" />}
                                    {service.type === 'tv_removal' && <MinusCircle className="h-5 w-5 text-orange-600" />}
                                    {service.type === 'smart_home' && <Camera className="h-5 w-5 text-green-600" />}
                                    <h4 className="font-semibold">
                                      {service.type === 'tv_installation' && 'TV Installation'}
                                      {service.type === 'tv_removal' && 'TV Removal'}
                                      {service.type === 'smart_home' && 'Smart Home Device'}
                                    </h4>
                                    <Badge variant="secondary">{formatPrice(calculateServicePrice(service))}</Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeService(service.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* TV Installation Configuration */}
                                {service.type === 'tv_installation' && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>TV Size</Label>
                                        <Select
                                          value={service.tvSize}
                                          onValueChange={(value) => updateService(service.id, { tvSize: value as any })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="small">Small (Up to 55") - $150</SelectItem>
                                            <SelectItem value="medium">Medium (56"-70") - $175</SelectItem>
                                            <SelectItem value="large">Large (71"-85") - $200</SelectItem>
                                            <SelectItem value="extra_large">Extra Large (86"+) - $250</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label>Mount Type</Label>
                                        <Select
                                          value={service.mountType}
                                          onValueChange={(value) => updateService(service.id, { mountType: value as any })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="fixed">Fixed Mount</SelectItem>
                                            <SelectItem value="tilting">Tilting (+$25)</SelectItem>
                                            <SelectItem value="full_motion">Full Motion (+$50)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div>
                                      <Label>Installation Location</Label>
                                      <Select
                                        value={service.location}
                                        onValueChange={(value) => updateService(service.id, { location: value as any })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="standard_wall">Standard Wall</SelectItem>
                                          <SelectItem value="fireplace">Above Fireplace (+$75)</SelectItem>
                                          <SelectItem value="corner">Corner Mount (+$35)</SelectItem>
                                          <SelectItem value="ceiling">Ceiling Mount (+$100)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Add-Ons</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(service.addOns).map(([addon, enabled]) => (
                                          <div key={addon} className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`${service.id}-${addon}`}
                                              checked={enabled}
                                              onCheckedChange={(checked) => 
                                                updateService(service.id, {
                                                  addOns: { ...service.addOns, [addon]: !!checked }
                                                })
                                              }
                                            />
                                            <Label htmlFor={`${service.id}-${addon}`} className="text-sm">
                                              {addon === 'masonryWall' && 'Masonry Wall (+$50)'}
                                              {addon === 'highRise' && 'High Rise (+$25)'}
                                              {addon === 'outletInstallation' && 'Outlet Installation (+$75)'}
                                              {addon === 'cableManagement' && 'Cable Management (+$40)'}
                                              {addon === 'soundbarMount' && 'Soundbar Mount (+$30)'}
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* TV Removal Configuration */}
                                {service.type === 'tv_removal' && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Number of TVs</Label>
                                      <Select
                                        value={service.quantity.toString()}
                                        onValueChange={(value) => updateService(service.id, { quantity: parseInt(value) })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {[1, 2, 3, 4, 5].map(num => (
                                            <SelectItem key={num} value={num.toString()}>
                                              {num} TV{num > 1 ? 's' : ''} - {formatPrice(PRICING_MATRIX.tv_removal.base * num)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${service.id}-patching`}
                                          checked={service.includePatching}
                                          onCheckedChange={(checked) => 
                                            updateService(service.id, { includePatching: !!checked })
                                          }
                                        />
                                        <Label htmlFor={`${service.id}-patching`}>
                                          Include Wall Patching (+$25 per TV)
                                        </Label>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Smart Home Configuration */}
                                {service.type === 'smart_home' && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Device Type</Label>
                                        <Select
                                          value={service.deviceType}
                                          onValueChange={(value) => updateService(service.id, { deviceType: value as any })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="security_camera">Security Camera - $75</SelectItem>
                                            <SelectItem value="video_doorbell">Video Doorbell - $85</SelectItem>
                                            <SelectItem value="floodlight_camera">Floodlight Camera - $95</SelectItem>
                                            <SelectItem value="smart_switch">Smart Switch - $50</SelectItem>
                                            <SelectItem value="other">Other Device - $65</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label>Quantity</Label>
                                        <Select
                                          value={service.quantity.toString()}
                                          onValueChange={(value) => updateService(service.id, { quantity: parseInt(value) })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                              <SelectItem key={num} value={num.toString()}>
                                                {num} Device{num > 1 ? 's' : ''}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div>
                                      <Label>Installation Location</Label>
                                      <Select
                                        value={service.location}
                                        onValueChange={(value) => updateService(service.id, { location: value as any })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="indoor">Indoor Installation</SelectItem>
                                          <SelectItem value="outdoor">Outdoor Installation (+20%)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Add-Ons</Label>
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`${service.id}-wiring`}
                                            checked={service.addOns.newWiring}
                                            onCheckedChange={(checked) => 
                                              updateService(service.id, {
                                                addOns: { ...service.addOns, newWiring: !!checked }
                                              })
                                            }
                                          />
                                          <Label htmlFor={`${service.id}-wiring`}>
                                            New Wiring Required (+$50)
                                          </Label>
                                        </div>
                                        {service.location === 'outdoor' && (
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`${service.id}-weatherproof`}
                                              checked={service.addOns.weatherproofing}
                                              onCheckedChange={(checked) => 
                                                updateService(service.id, {
                                                  addOns: { ...service.addOns, weatherproofing: !!checked }
                                                })
                                              }
                                            />
                                            <Label htmlFor={`${service.id}-weatherproof`}>
                                              Weatherproofing (+$25)
                                            </Label>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                    </AnimatePresence>

                    {services.filter(service => 
                      (activeTab === 'tv_install' && service.type === 'tv_installation') ||
                      (activeTab === 'tv_removal' && service.type === 'tv_removal') ||
                      (activeTab === 'smart_home' && service.type === 'smart_home')
                    ).length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No services selected in this category</p>
                        <p className="text-sm">Click "Add" above to get started</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Pricing Panel */}
                <div className="bg-gray-50 p-6 border-l">
                  <div className="sticky top-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Live Pricing
                    </h3>

                    {services.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>Select services to see pricing</p>
                      </div>
                    )}

                    {services.length > 0 && (
                      <div className="space-y-4">
                        {/* Service breakdown */}
                        <div className="space-y-2">
                          {services.map((service) => (
                            <div key={service.id} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {service.type === 'tv_installation' && `TV Install (${service.tvSize})`}
                                {service.type === 'tv_removal' && `TV Remove (${service.quantity}x)`}
                                {service.type === 'smart_home' && `${service.deviceType} (${service.quantity}x)`}
                              </span>
                              <span className="font-medium">{formatPrice(calculateServicePrice(service))}</span>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Totals */}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Atlanta Tax (8%)</span>
                            <span>{formatPrice(tax)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Service Fee</span>
                            <span>{formatPrice(PRICING_MATRIX.service_fee)}</span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span className="text-blue-600">{formatPrice(total)}</span>
                          </div>
                        </div>

                        {/* Location indicator */}
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-4">
                          <MapPin className="h-3 w-3" />
                          Metro Atlanta area pricing
                        </div>

                        {/* Continue button */}
                        <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                          Continue to Date & Time
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}