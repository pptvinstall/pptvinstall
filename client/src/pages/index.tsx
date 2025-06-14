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

// Booking Info Form
interface BookingInfo {
  fullName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes: string;
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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingFormErrors, setBookingFormErrors] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tvRemovalQuantity, setTvRemovalQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [completingBooking, setCompletingBooking] = useState<boolean>(false);
  
  const [bookingInfo, setBookingInfo] = useState<BookingInfo>({
    fullName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: 'Georgia',
      zipCode: ''
    },
    notes: ''
  });

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
  };

  // Booking form validation
  const validateBookingForm = (): string[] => {
    const errors: string[] = [];
    
    if (!bookingInfo.fullName.trim()) errors.push('Full name is required');
    if (!bookingInfo.email.trim()) errors.push('Email address is required');
    if (!bookingInfo.phone.trim()) errors.push('Phone number is required');
    if (!bookingInfo.address.street.trim()) errors.push('Street address is required');
    if (!bookingInfo.address.city.trim()) errors.push('City is required');
    if (!bookingInfo.address.zipCode.trim()) errors.push('Zip code is required');
    
    // Email validation
    if (bookingInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingInfo.email)) {
      errors.push('Please enter a valid email address');
    }
    
    // Phone validation (basic)
    if (bookingInfo.phone && !/^[\d\s\-\(\)\+]{10,}$/.test(bookingInfo.phone.replace(/\D/g, ''))) {
      errors.push('Please enter a valid phone number');
    }
    
    return errors;
  };

  const handleBookingFormSubmit = () => {
    const errors = validateBookingForm();
    setBookingFormErrors(errors);
    
    if (errors.length === 0) {
      // Form is valid, proceed to scheduling
      setShowBookingForm(false);
      setShowScheduling(true);
    }
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

  // Fetch available time slots from Google Calendar API
  const fetchAvailableSlots = async (date: string) => {
    try {
      setLoadingSlots(true);
      const response = await fetch(`/api/calendar/availability/${date}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableSlots(data.availableSlots);
      } else {
        console.error('Failed to fetch available slots:', data.message);
        // Fallback to default slots if API fails
        setAvailableSlots([
          '5:30 PM - 7:30 PM',
          '7:30 PM - 9:30 PM',
          '12:00 PM - 2:00 PM',
          '2:00 PM - 4:00 PM',
          '4:00 PM - 6:00 PM'
        ]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      // Fallback to default slots
      setAvailableSlots([
        '5:30 PM - 7:30 PM',
        '7:30 PM - 9:30 PM',
        '12:00 PM - 2:00 PM',
        '2:00 PM - 4:00 PM',
        '4:00 PM - 6:00 PM'
      ]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Complete booking with Google Calendar integration
  const completeBooking = async () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select a date and time for your appointment.');
      return;
    }

    setCompletingBooking(true);
    
    try {
      const bookingData = {
        fullName: bookingInfo.fullName,
        email: bookingInfo.email,
        phone: bookingInfo.phone,
        address: bookingInfo.address,
        notes: bookingInfo.notes,
        selectedDate,
        selectedTime,
        services: cart.items,
        totalAmount: cart.total
      };

      const response = await fetch('/api/bookings/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        alert(`Booking confirmed! Your confirmation number is: ${result.booking.confirmationNumber}`);
        
        // Reset form and cart
        setCart({ items: [], subtotal: 0, discount: 0, discountLabel: '', total: 0 });
        setBookingInfo({
          fullName: '',
          email: '',
          phone: '',
          address: { street: '', city: '', state: 'Georgia', zipCode: '' },
          notes: ''
        });
        setSelectedDate('');
        setSelectedTime('');
        setShowScheduling(false);
        setSelectedService(null);
      } else {
        alert(`Booking failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error completing booking:', error);
      alert('An error occurred while completing your booking. Please try again.');
    } finally {
      setCompletingBooking(false);
    }
  };

  const availableDates = getAvailableDates();

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
    setEditingItemId(null);
  }, [calculateCartTotals]);

  const editCartItem = useCallback((itemId: string, serviceType: 'tv-installation' | 'tv-removal' | 'smart-home', displayName: string, price: number, configuration: any) => {
    setCart(prevCart => {
      const newItems = prevCart.items.map(item => 
        item.id === itemId 
          ? { ...item, displayName, price, configuration }
          : item
      );
      const totals = calculateCartTotals(newItems);
      return {
        items: newItems,
        ...totals
      };
    });
    
    // Reset editing state
    setSelectedService(null);
    setEditingItemId(null);
  }, [calculateCartTotals]);

  const startEditItem = useCallback((item: CartItem) => {
    setEditingItemId(item.id);
    setSelectedService(item.serviceType);
    
    // Pre-fill the configuration based on service type
    if (item.serviceType === 'tv-installation') {
      setTvOptions(item.configuration);
    } else if (item.serviceType === 'smart-home') {
      setSmartHomeOptions(item.configuration);
    } else if (item.serviceType === 'tv-removal') {
      setTvRemovalQuantity(item.configuration.quantity || 1);
    }
  }, []);

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
      total = 50 * tvRemovalQuantity;
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
      const quantity = options.quantity || 1;
      return quantity > 1 ? `${quantity}x TV De-Installation` : 'TV De-Installation';
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
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">TV De-Installation Service</h3>
            
            {/* Quantity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Number of TVs to Remove</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setTvRemovalQuantity(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-lg font-semibold text-gray-900 min-w-[2rem] text-center">
                  {tvRemovalQuantity}
                </span>
                <button
                  onClick={() => setTvRemovalQuantity(prev => prev + 1)}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
                <span className="text-sm text-gray-600 ml-3">
                  $50 per TV × {tvRemovalQuantity} = ${50 * tvRemovalQuantity}
                </span>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Service includes (per TV):</strong>
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
                const config = selectedService === 'tv-installation' ? tvOptions :
                              selectedService === 'smart-home' ? smartHomeOptions : 
                              { quantity: tvRemovalQuantity };
                const displayName = generateDisplayName(selectedService, config);
                
                if (editingItemId) {
                  editCartItem(editingItemId, selectedService as any, displayName, currentServicePrice, config);
                } else {
                  addToCart(selectedService as any, displayName, currentServicePrice, config);
                }
              }}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                selectedService === 'tv-installation' ? 'bg-blue-600 hover:bg-blue-700' :
                selectedService === 'tv-removal' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-green-600 hover:bg-green-700'
              } shadow-lg hover:shadow-xl`}
            >
              {editingItemId ? `Update Item - $${currentServicePrice}` : `Add to Cart - $${currentServicePrice}`}
            </button>
          </div>
        )}

        {/* Cart Display */}
        {cart.items.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Your Services</h3>
            
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.displayName}</p>
                      <p className="text-lg font-bold text-blue-600 mt-1">${item.price}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => startEditItem(item)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium text-sm rounded-lg transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 font-medium text-sm rounded-lg transition-colors duration-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>${cart.subtotal}</span>
              </div>
              {cart.discount > 0 && (
                <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center text-sm text-green-700">
                    <span className="font-semibold">💰 {cart.discountLabel}:</span>
                    <span className="font-bold text-green-800">-${cart.discount}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {cart.discountLabel.includes('Bundle') ? 'Smart Home + TV Install combo savings' :
                     cart.discountLabel.includes('10%') ? 'Volume discount for 3+ services' :
                     'Multi-service discount applied'}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-semibold text-gray-900 mt-3">
                <span>Total:</span>
                <span className="text-xl">${cart.total}</span>
              </div>
            </div>

            <button
              onClick={() => setShowBookingForm(true)}
              className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Continue to Booking
            </button>
          </div>
        )}

        {/* Booking Information Form */}
        {showBookingForm && cart.items.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Booking Information</h3>
              <button
                onClick={() => setShowBookingForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                ✕
              </button>
            </div>

            {/* Error Messages */}
            {bookingFormErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {bookingFormErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={bookingInfo.fullName}
                    onChange={(e) => {
                      setBookingInfo(prev => ({ ...prev, fullName: e.target.value }));
                      if (bookingFormErrors.length > 0) setBookingFormErrors([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={bookingInfo.phone}
                    onChange={(e) => setBookingInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={bookingInfo.email}
                  onChange={(e) => setBookingInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Service Address */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Service Address</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={bookingInfo.address.street}
                      onChange={(e) => setBookingInfo(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={bookingInfo.address.city}
                        onChange={(e) => setBookingInfo(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Atlanta"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <select
                        value={bookingInfo.address.state}
                        onChange={(e) => setBookingInfo(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Georgia">Georgia</option>
                        <option value="Alabama">Alabama</option>
                        <option value="Tennessee">Tennessee</option>
                        <option value="North Carolina">North Carolina</option>
                        <option value="South Carolina">South Carolina</option>
                        <option value="Florida">Florida</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zip Code *
                      </label>
                      <input
                        type="text"
                        value={bookingInfo.address.zipCode}
                        onChange={(e) => setBookingInfo(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, zipCode: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="30309"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={bookingInfo.notes}
                  onChange={(e) => setBookingInfo(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gate code, special instructions, preferred contact method, etc."
                />
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4 pt-6">
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="flex-1 py-4 px-6 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  Back to Cart
                </button>
                <button
                  onClick={handleBookingFormSubmit}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Continue to Scheduling
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Summary */}
        {showScheduling && cart.items.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Booking Summary</h3>
              <button
                onClick={() => {
                  setShowScheduling(false);
                  setShowBookingForm(true);
                }}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Edit Info
              </button>
            </div>
            
            {/* Customer Info */}
            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Contact & Service Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Customer:</p>
                  <p className="font-medium">{bookingInfo.fullName || 'Not provided'}</p>
                  <p className="text-gray-600 mt-2">Email:</p>
                  <p className="font-medium">{bookingInfo.email || 'Not provided'}</p>
                  <p className="text-gray-600 mt-2">Phone:</p>
                  <p className="font-medium">{bookingInfo.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Service Address:</p>
                  <p className="font-medium">
                    {bookingInfo.address.street || 'Not provided'}<br/>
                    {bookingInfo.address.city && bookingInfo.address.state && 
                      `${bookingInfo.address.city}, ${bookingInfo.address.state} ${bookingInfo.address.zipCode}`
                    }
                  </p>
                  {bookingInfo.notes && (
                    <>
                      <p className="text-gray-600 mt-2">Special Instructions:</p>
                      <p className="font-medium text-sm">{bookingInfo.notes}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Service Items */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Services Ordered</h4>
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.displayName}</p>
                    </div>
                    <p className="font-semibold text-gray-900">${item.price}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span>${cart.subtotal}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600 mt-1">
                    <span>{cart.discountLabel}:</span>
                    <span>-${cart.discount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2">
                  <span>Total:</span>
                  <span>${cart.total}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date & Time Selection */}
        {showScheduling && cart.items.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Schedule Your Service</h3>
            
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Date</label>
              <div className="grid grid-cols-2 gap-2">
                {availableDates.slice(0, 8).map((dateObj) => (
                  <button
                    key={dateObj.date}
                    onClick={() => {
                      setSelectedDate(dateObj.date);
                      setSelectedTime('');
                      fetchAvailableSlots(dateObj.date);
                    }}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      selectedDate === dateObj.date
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
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Time for {availableDates.find(d => d.date === selectedDate)?.full}
                </label>
                {loadingSlots ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading available times...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {availableSlots.length > 0 ? availableSlots.map((time: string) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          selectedTime === time
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {time}
                      </button>
                    )) : (
                      <div className="text-center py-4 text-gray-500">
                        No available time slots for this date. Please select another date.
                      </div>
                    )}
                  </div>
                )}
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
        {showScheduling && selectedDate && selectedTime && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Booking Summary</h4>
            <div className="space-y-1 text-sm text-green-800">
              <p><strong>Total Services:</strong> {cart.items.length}</p>
              <p><strong>Total Cost:</strong> ${cart.total}</p>
              <p><strong>Scheduled:</strong> {availableDates.find(d => d.date === selectedDate)?.full} at {selectedTime}</p>
            </div>
            <button 
              onClick={completeBooking}
              disabled={completingBooking}
              className="w-full mt-4 py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
            >
              {completingBooking ? 'Completing Booking...' : 'Complete Booking'}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}