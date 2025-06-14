import { useState, useMemo, useCallback } from 'react';

// TV Installation Options
interface TVInstallOptions {
  tvSize: '32-55' | '56-plus';
  mountType: 'fixed' | 'tilting' | 'full-motion' | 'customer-provided';
  wallType: 'standard' | 'over-fireplace';
  wallMaterial: 'standard' | 'brick-stone' | 'high-rise-steel';
  addOutlet: boolean;
}

// Smart Home Options
interface SmartHomeOptions {
  deviceType: 'security-camera' | 'video-doorbell' | 'floodlight-camera';
  quantity: number;
}

// Cart Item interface
interface CartItem {
  id: string;
  serviceType: 'tv-installation' | 'tv-removal' | 'smart-home';
  displayName: string;
  price: number;
  configuration: any; // Store the specific config for each service
}

// Booking Options
interface BookingOptions {
  selectedDate: string | null;
  selectedTime: string | null;
}

// Cart state
interface CartState {
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountLabel: string;
  total: number;
}

export default function HomePage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [tvOptions, setTvOptions] = useState<TVInstallOptions>({
    tvSize: '32-55',
    mountType: 'fixed',
    wallType: 'standard',
    wallMaterial: 'standard',
    addOutlet: false
  });
  
  const [smartHomeOptions, setSmartHomeOptions] = useState<SmartHomeOptions>({
    deviceType: 'security-camera',
    quantity: 1
  });

  const [booking, setBooking] = useState<BookingOptions>({
    selectedDate: null,
    selectedTime: null
  });

  const [cart, setCart] = useState<CartState>({
    items: [],
    subtotal: 0,
    discount: 0,
    discountLabel: '',
    total: 0
  });

  const [showScheduling, setShowScheduling] = useState(false);

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
  };

  // Date and time helper functions
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    // Start from tomorrow to avoid same-day booking issues
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays (0 = Sunday)
      if (date.getDay() !== 0) {
        dates.push({
          date: date.toISOString().split('T')[0],
          display: date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          }),
          full: date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })
        });
      }
    }
    return dates;
  };

  const getAvailableTimeSlots = () => {
    return [
      '9:00 AM',
      '11:00 AM', 
      '1:00 PM',
      '3:00 PM',
      '5:00 PM'
    ];
  };

  const availableDates = getAvailableDates();
  const availableTimeSlots = getAvailableTimeSlots();

  // Cart management functions
  const calculateCartTotals = useCallback((items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    
    let discount = 0;
    let discountLabel = '';
    
    // Bundle discount logic
    const hasSmartHome = items.some(item => item.serviceType === 'smart-home');
    const hasTVInstall = items.some(item => item.serviceType === 'tv-installation');
    const distinctServices = new Set(items.map(item => item.serviceType)).size;
    const totalItems = items.length;
    
    if (hasSmartHome && hasTVInstall) {
      discount = 25;
      discountLabel = 'Smart Home + TV Bundle';
    } else if (totalItems >= 3) {
      discount = Math.round(subtotal * 0.1);
      discountLabel = '3+ Items (10% off)';
    } else if (distinctServices >= 2) {
      discount = Math.round(subtotal * 0.05);
      discountLabel = 'Multi-Service (5% off)';
    }
    
    return {
      subtotal,
      discount,
      discountLabel,
      total: subtotal - discount
    };
  }, []);

  const generateCartItemId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addToCart = useCallback((serviceType: 'tv-installation' | 'tv-removal' | 'smart-home', displayName: string, price: number, configuration: any) => {
    const newItem: CartItem = {
      id: generateCartItemId(),
      serviceType,
      displayName,
      price,
      configuration
    };
    
    setCart(prevCart => {
      const newItems = [...prevCart.items, newItem];
      const totals = calculateCartTotals(newItems);
      return {
        items: newItems,
        ...totals
      };
    });
    
    // Reset current service selection to allow adding more
    setSelectedService(null);
  }, [calculateCartTotals]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.id !== itemId);
      const totals = calculateCartTotals(newItems);
      return {
        items: newItems,
        ...totals
      };
    });
  }, [calculateCartTotals]);

  // Individual service pricing calculations
  const currentServicePrice = useMemo(() => {
    let total = 0;

    if (selectedService === 'tv-installation') {
      const basePrice = 100;
      
      // Mount prices based on TV size
      const mountPrices = tvOptions.tvSize === '32-55' 
        ? {
            'fixed': 30,
            'tilting': 40,
            'full-motion': 60,
            'customer-provided': 0
          }
        : {
            'fixed': 40,
            'tilting': 50,
            'full-motion': 80,
            'customer-provided': 0
          };
      
      const wallTypePrices = {
        'standard': 0,
        'over-fireplace': 100
      };

      const wallMaterialPrices = {
        'standard': 0,
        'brick-stone': 50,
        'high-rise-steel': 25
      };
      
      const outletPrice = tvOptions.addOutlet ? 100 : 0;

      total = basePrice + mountPrices[tvOptions.mountType] + wallTypePrices[tvOptions.wallType] + wallMaterialPrices[tvOptions.wallMaterial] + outletPrice;
    }

    if (selectedService === 'tv-removal') {
      total = 50;
    }

    if (selectedService === 'smart-home') {
      const devicePrices = {
        'security-camera': 75,
        'video-doorbell': 85,
        'floodlight-camera': 125
      };
      total = devicePrices[smartHomeOptions.deviceType] * smartHomeOptions.quantity;
    }

    return total;
  }, [selectedService, tvOptions, smartHomeOptions]);

  // Helper functions for cart display names
  const generateDisplayName = (serviceType: string, options: any) => {
    if (serviceType === 'tv-installation') {
      const mountType = options.mountType === 'fixed' ? 'Fixed' : 
                       options.mountType === 'tilting' ? 'Tilting' : 
                       options.mountType === 'full-motion' ? 'Full Motion' : 'Customer Mount';
      const wallType = options.wallType === 'over-fireplace' ? 'Over Fireplace' : 'Standard Wall';
      const material = options.wallMaterial === 'brick-stone' ? ', Brick/Stone' :
                      options.wallMaterial === 'high-rise-steel' ? ', High-Rise' : '';
      return `TV Install - ${mountType}, ${wallType}${material}`;
    } else if (serviceType === 'tv-removal') {
      return 'TV De-Installation';
    } else if (serviceType === 'smart-home') {
      const deviceName = options.deviceType === 'security-camera' ? 'Security Camera' :
                         options.deviceType === 'video-doorbell' ? 'Video Doorbell' : 'Floodlight Camera';
      return `${options.quantity}x ${deviceName}`;
    }
    return 'Service';
  };

  // Get current mount prices for display
  const getCurrentMountPrices = () => {
    return tvOptions.tvSize === '32-55' 
      ? [
          { value: 'fixed', label: 'Fixed', price: 30 },
          { value: 'tilting', label: 'Tilting', price: 40 },
          { value: 'full-motion', label: 'Full Motion', price: 60 },
          { value: 'customer-provided', label: 'Customer-Provided', price: 0 }
        ]
      : [
          { value: 'fixed', label: 'Fixed', price: 40 },
          { value: 'tilting', label: 'Tilting', price: 50 },
          { value: 'full-motion', label: 'Full Motion', price: 80 },
          { value: 'customer-provided', label: 'Customer-Provided', price: 0 }
        ];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <h1 className="text-2xl font-bold">TV & Smart Home Services</h1>
          <p className="text-blue-100 mt-1">Professional installation in Metro Atlanta</p>
          {cart.items.length > 0 && (
            <div className="mt-3 bg-blue-500 bg-opacity-30 rounded-lg p-3">
              <p className="text-sm font-medium">{cart.items.length} service{cart.items.length > 1 ? 's' : ''} in cart - ${cart.total}</p>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Service Buttons */}
        <div className="space-y-4 mb-8">
          {/* TV Installation Button */}
          <button 
            onClick={() => handleServiceSelect('tv-installation')}
            className={`w-full font-semibold py-6 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg border-2 ${
              selectedService === 'tv-installation'
                ? 'bg-blue-800 border-blue-900 text-white shadow-xl scale-[1.02]'
                : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
            }`}
          >
            TV Installation
          </button>

          {/* TV De-Installation Button */}
          <button 
            onClick={() => handleServiceSelect('tv-removal')}
            className={`w-full font-semibold py-6 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg border-2 ${
              selectedService === 'tv-removal'
                ? 'bg-orange-800 border-orange-900 text-white shadow-xl scale-[1.02]'
                : 'bg-orange-600 hover:bg-orange-700 border-orange-600 text-white'
            }`}
          >
            TV De-Installation
          </button>

          {/* Smart Home Devices Button */}
          <button 
            onClick={() => handleServiceSelect('smart-home')}
            className={`w-full font-semibold py-6 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg border-2 ${
              selectedService === 'smart-home'
                ? 'bg-green-800 border-green-900 text-white shadow-xl scale-[1.02]'
                : 'bg-green-600 hover:bg-green-700 border-green-600 text-white'
            }`}
          >
            Smart Home Devices
          </button>
        </div>

        {/* TV Installation Options */}
        {selectedService === 'tv-installation' && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Your Installation</h3>
            
            {/* TV Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">TV Size</label>
              <div className="space-y-2">
                {[
                  { value: '32-55', label: '32" - 55"', description: 'Standard pricing' },
                  { value: '56-plus', label: '56" and larger', description: 'Premium pricing' }
                ].map((size) => (
                  <label key={size.value} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="tvSize"
                        value={size.value}
                        checked={tvOptions.tvSize === size.value}
                        onChange={(e) => setTvOptions(prev => ({ ...prev, tvSize: e.target.value as any }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-700">{size.label}</span>
                        <p className="text-xs text-gray-500">{size.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Mount Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Mount Type</label>
              <div className="space-y-2">
                {getCurrentMountPrices().map((mount) => (
                  <label key={mount.value} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="mountType"
                        value={mount.value}
                        checked={tvOptions.mountType === mount.value}
                        onChange={(e) => setTvOptions(prev => ({ ...prev, mountType: e.target.value as any }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">{mount.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {mount.price === 0 ? 'Free' : `+$${mount.price}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Wall Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Wall Type</label>
              <div className="space-y-2">
                {[
                  { value: 'standard', label: 'Standard Wall', price: 0 },
                  { value: 'over-fireplace', label: 'Over Fireplace', price: 100 }
                ].map((wall) => (
                  <label key={wall.value} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="wallType"
                        value={wall.value}
                        checked={tvOptions.wallType === wall.value}
                        onChange={(e) => setTvOptions(prev => ({ ...prev, wallType: e.target.value as any }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">{wall.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {wall.price === 0 ? 'Included' : `+$${wall.price}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Wall Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Wall Material</label>
              <div className="space-y-2">
                {[
                  { value: 'standard', label: 'Standard Drywall', price: 0 },
                  { value: 'brick-stone', label: 'Brick/Stone Surface', price: 50 },
                  { value: 'high-rise-steel', label: 'High-Rise/Steel Studs', price: 25 }
                ].map((material) => (
                  <label key={material.value} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="wallMaterial"
                        value={material.value}
                        checked={tvOptions.wallMaterial === material.value}
                        onChange={(e) => setTvOptions(prev => ({ ...prev, wallMaterial: e.target.value as any }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">{material.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {material.price === 0 ? 'Included' : `+$${material.price}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Add Outlet */}
            <div>
              <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tvOptions.addOutlet}
                    onChange={(e) => setTvOptions(prev => ({ ...prev, addOutlet: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">Add power outlet behind TV</span>
                </div>
                <span className="text-sm font-semibold text-blue-600">+$100</span>
              </label>
            </div>
          </div>
        )}

        {/* TV De-Installation Options */}
        {selectedService === 'tv-removal' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">TV De-Installation Service</h3>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Service includes:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Remove mounted TV safely</li>
                <li>• Remove wall bracket and hardware</li>
                <li>• Patch screw holes in wall</li>
                <li>• Clean up work area</li>
              </ul>
            </div>
          </div>
        )}

        {/* Smart Home Options */}
        {selectedService === 'smart-home' && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Smart Home Device Installation</h3>
            
            {/* Device Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Device Type</label>
              <div className="space-y-2">
                {[
                  { value: 'security-camera', label: 'Security Camera', price: 75, description: 'Indoor/outdoor camera setup' },
                  { value: 'video-doorbell', label: 'Video Doorbell', price: 85, description: 'Smart doorbell with video' },
                  { value: 'floodlight-camera', label: 'Floodlight Camera', price: 125, description: 'Security light with camera' }
                ].map((device) => (
                  <label key={device.value} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="deviceType"
                        value={device.value}
                        checked={smartHomeOptions.deviceType === device.value}
                        onChange={(e) => setSmartHomeOptions(prev => ({ ...prev, deviceType: e.target.value as any }))}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-700">{device.label}</span>
                        <p className="text-xs text-gray-500">{device.description}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-green-600">${device.price} each</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Quantity</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSmartHomeOptions(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-lg font-semibold text-gray-900 min-w-[2rem] text-center">
                  {smartHomeOptions.quantity}
                </span>
                <button
                  onClick={() => setSmartHomeOptions(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        {selectedService && currentServicePrice > 0 && (
          <div className="mt-6">
            <button
              onClick={() => {
                const displayName = generateDisplayName(selectedService, 
                  selectedService === 'tv-installation' ? tvOptions :
                  selectedService === 'smart-home' ? smartHomeOptions : {}
                );
                addToCart(selectedService as any, displayName, currentServicePrice, 
                  selectedService === 'tv-installation' ? tvOptions :
                  selectedService === 'smart-home' ? smartHomeOptions : {}
                );
              }}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                selectedService === 'tv-installation' ? 'bg-blue-600 hover:bg-blue-700' :
                selectedService === 'tv-removal' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-green-600 hover:bg-green-700'
              } shadow-lg hover:shadow-xl`}
            >
              Add to Cart - ${currentServicePrice}
            </button>
          </div>
        )}

        {/* Cart Display */}
        {cart.items.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Services</h3>
            
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.displayName}</p>
                    <p className="text-sm text-gray-600">${item.price}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>${cart.subtotal}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>{cart.discountLabel}:</span>
                  <span>-${cart.discount}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-semibold text-gray-900 mt-2">
                <span>Total:</span>
                <span>${cart.total}</span>
              </div>
            </div>

            <button
              onClick={() => setShowScheduling(true)}
              className="w-full mt-4 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200"
            >
              Continue to Scheduling
            </button>
          </div>
        )}

        {/* Date & Time Selection */}
        {showScheduling && cart.items.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Schedule Your Service</h3>
            
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Date</label>
              <div className="grid grid-cols-2 gap-2">
                {availableDates.slice(0, 8).map((dateObj) => (
                  <button
                    key={dateObj.date}
                    onClick={() => setBooking(prev => ({ ...prev, selectedDate: dateObj.date, selectedTime: null }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      booking.selectedDate === dateObj.date
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{dateObj.display.split(',')[0]}</div>
                      <div className="text-xs opacity-75">{dateObj.display.split(',')[1]?.trim()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {booking.selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Time for {availableDates.find(d => d.date === booking.selectedDate)?.full}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTimeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setBooking(prev => ({ ...prev, selectedTime: time }))}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        booking.selectedTime === time
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current Service Price Display */}
        {selectedService && currentServicePrice > 0 && (
          <div className={`mt-6 rounded-lg p-4 border ${
            selectedService === 'tv-installation' ? 'bg-blue-50 border-blue-200' :
            selectedService === 'tv-removal' ? 'bg-orange-50 border-orange-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Service Price:</span>
              <span className={`text-2xl font-bold ${
                selectedService === 'tv-installation' ? 'text-blue-600' :
                selectedService === 'tv-removal' ? 'text-orange-600' :
                'text-green-600'
              }`}>
                ${currentServicePrice}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Add to cart to continue</p>
          </div>
        )}

        {/* Final Booking Summary (only show if scheduling is active) */}
        {showScheduling && booking.selectedDate && booking.selectedTime && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Booking Summary</h4>
            <div className="space-y-1 text-sm text-green-800">
              <p><strong>Total Services:</strong> {cart.items.length}</p>
              <p><strong>Total Cost:</strong> ${cart.total}</p>
              <p><strong>Scheduled:</strong> {availableDates.find(d => d.date === booking.selectedDate)?.full} at {booking.selectedTime}</p>
            </div>
            <button className="w-full mt-4 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200">
              Complete Booking
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}