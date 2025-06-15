import { useState, useMemo, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Calendar, Clock, MapPin, User, Phone, Mail, CreditCard, CheckCircle, Trash2, Edit3 } from 'lucide-react';
import Logo from '../components/brand/Logo';

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
  configuration: any;
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

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState<'services' | 'info' | 'scheduling' | 'review'>('services');
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

  const [cart, setCart] = useState<CartState>({
    items: [],
    subtotal: 0,
    discount: 0,
    discountLabel: '',
    total: 0
  });

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

  // Pricing calculations
  const calculateTVInstallPrice = useCallback((options: TVInstallOptions): number => {
    let basePrice = 100; // Standard TV mounting (customer mount)
    
    if (options.mountType === 'tilting') basePrice += 25;
    if (options.mountType === 'full-motion') basePrice += 50;
    if (options.wallType === 'over-fireplace') basePrice = 200; // Fireplace mounting is flat $200
    if (options.wallMaterial === 'brick-stone') basePrice += 50;
    if (options.wallMaterial === 'high-rise-steel') basePrice += 25;
    if (options.addOutlet) basePrice += 100; // Wire concealment with new outlet
    
    return basePrice;
  }, []);

  const calculateSmartHomePrice = useCallback((options: SmartHomeOptions): number => {
    const basePrice = options.deviceType === 'security-camera' ? 75 : 
                     options.deviceType === 'video-doorbell' ? 85 : 125;
    return basePrice * options.quantity;
  }, []);

  // Cart management
  const addToCart = useCallback((serviceType: string, configuration: any) => {
    let price = 0;
    let displayName = '';
    
    if (serviceType === 'tv-installation') {
      price = calculateTVInstallPrice(configuration);
      displayName = `${configuration.tvSize}" TV Wall Mount - ${configuration.mountType}`;
    } else if (serviceType === 'fireplace-tv') {
      price = 200; // Flat rate for fireplace mounting
      displayName = `Fireplace TV Installation`;
    } else if (serviceType === 'wire-concealment') {
      price = 100; // Flat rate for wire concealment with outlet
      displayName = `Wire Concealment & New Outlet`;
    } else if (serviceType === 'smart-home') {
      price = calculateSmartHomePrice(configuration);
      displayName = `${configuration.deviceType.replace('-', ' ')} (${configuration.quantity}x)`;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      serviceType: serviceType as any,
      displayName,
      price,
      configuration
    };

    setCart(prev => {
      const newItems = [...prev.items, newItem];
      const newSubtotal = newItems.reduce((sum, item) => sum + item.price, 0);
      const newTotal = Math.max(0, newSubtotal - prev.discount);
      
      return {
        ...prev,
        items: newItems,
        subtotal: newSubtotal,
        total: newTotal
      };
    });

    setSelectedService(null);
  }, [calculateTVInstallPrice, calculateSmartHomePrice]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(item => item.id !== itemId);
      const newSubtotal = newItems.reduce((sum, item) => sum + item.price, 0);
      const newTotal = Math.max(0, newSubtotal - prev.discount);
      
      return {
        ...prev,
        items: newItems,
        subtotal: newSubtotal,
        total: newTotal
      };
    });
  }, []);

  // Date/time management
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (dayName !== 'Sunday') {
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
  }, []);

  const loadAvailableSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    try {
      const response = await fetch(`/api/calendar/availability/${date}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } else {
        // Fallback slots if API endpoint doesn't exist
        setAvailableSlots([
          '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
          '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      setAvailableSlots([
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
      ]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Form validation
  const validateBookingForm = (): string[] => {
    const errors: string[] = [];
    
    if (!bookingInfo.fullName.trim()) errors.push('Full name is required');
    if (!bookingInfo.email.trim()) errors.push('Email address is required');
    if (!bookingInfo.phone.trim()) errors.push('Phone number is required');
    if (!bookingInfo.address.street.trim()) errors.push('Street address is required');
    if (!bookingInfo.address.city.trim()) errors.push('City is required');
    if (!bookingInfo.address.zipCode.trim()) errors.push('Zip code is required');
    
    if (bookingInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingInfo.email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (bookingInfo.phone) {
      const cleanPhone = bookingInfo.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        errors.push('Please enter a valid phone number (10-15 digits)');
      }
    }
    
    return errors;
  };

  // Final booking submission
  const completeBooking = async () => {
    if (!selectedDate || !selectedTime || cart.items.length === 0) {
      alert('Please ensure you have selected services, date, and time for your appointment.');
      return;
    }

    setCompletingBooking(true);
    
    try {
      const bookingData = {
        fullName: bookingInfo.fullName.trim(),
        email: bookingInfo.email.trim().toLowerCase(),
        phone: bookingInfo.phone.replace(/\D/g, ''),
        address: {
          street: bookingInfo.address.street.trim(),
          city: bookingInfo.address.city.trim(),
          state: bookingInfo.address.state,
          zipCode: bookingInfo.address.zipCode.trim()
        },
        notes: bookingInfo.notes.trim(),
        selectedDate,
        selectedTime,
        services: cart.items.map(item => ({
          ...item,
          displayName: item.displayName.trim()
        })),
        totalAmount: cart.total
      };

      const response = await fetch('/api/bookings/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const bookingDetails = {
          confirmationNumber: result.booking.confirmationNumber,
          customerName: bookingInfo.fullName,
          email: bookingInfo.email,
          phone: bookingInfo.phone,
          address: `${bookingInfo.address.street}, ${bookingInfo.address.city}, ${bookingInfo.address.state} ${bookingInfo.address.zipCode}`,
          selectedDate,
          selectedTime,
          services: cart.items.map(item => ({
            displayName: item.displayName,
            price: item.price
          })),
          totalAmount: cart.total
        };
        
        localStorage.setItem(`booking-${result.booking.confirmationNumber}`, JSON.stringify(bookingDetails));
        
        // Reset form and show success
        setCart({ items: [], subtotal: 0, discount: 0, discountLabel: '', total: 0 });
        setCurrentStep('services');
        alert(`Booking confirmed! Your confirmation number is: ${result.booking.confirmationNumber}`);
      } else {
        alert(`Booking failed: ${result.message || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error completing booking:', error);
      alert(`Booking failed: Please try again.`);
    } finally {
      setCompletingBooking(false);
    }
  };

  const stepProgress = {
    'services': 25,
    'info': 50,
    'scheduling': 75,
    'review': 100
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/">
              <div className="flex items-center space-x-4 cursor-pointer group">
                <ArrowLeft className="h-6 w-6 text-blue-600 group-hover:text-red-600 transition-colors duration-200" />
                <Logo size="md" variant="color" showText={true} />
              </div>
            </Link>
            
            <div className="text-sm text-blue-900">
              Need help? <span className="font-bold text-blue-600 text-lg">(404) 702-4748</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-blue-900">Book Your Service</h2>
            <div className="text-sm text-blue-600 font-semibold">
              Step {Object.keys(stepProgress).indexOf(currentStep) + 1} of 4
            </div>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${stepProgress[currentStep]}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Step 1: Services */}
            {currentStep === 'services' && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Select Your Services</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* TV Installation */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-colors cursor-pointer"
                       onClick={() => setSelectedService('tv-installation')}>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">TV Wall Mounting</h3>
                    <p className="text-gray-600 mb-4">Professional TV mounting on all wall types</p>
                    <p className="text-2xl font-bold text-blue-600">Starting at $100</p>
                  </div>

                  {/* Fireplace TV */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-colors cursor-pointer"
                       onClick={() => setSelectedService('fireplace-tv')}>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Fireplace TV Installation</h3>
                    <p className="text-gray-600 mb-4">Over fireplace mounting with heat management</p>
                    <p className="text-2xl font-bold text-blue-600">Starting at $200</p>
                  </div>

                  {/* Wire Concealment */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-colors cursor-pointer"
                       onClick={() => setSelectedService('wire-concealment')}>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Wire Concealment & Outlets</h3>
                    <p className="text-gray-600 mb-4">New outlet installation behind TV</p>
                    <p className="text-2xl font-bold text-blue-600">Starting at $100</p>
                  </div>

                  {/* Smart Home */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-colors cursor-pointer"
                       onClick={() => setSelectedService('smart-home')}>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Home Installation</h3>
                    <p className="text-gray-600 mb-4">Security cameras, doorbells, and smart devices</p>
                    <p className="text-2xl font-bold text-blue-600">Starting at $75</p>
                  </div>
                </div>

                {/* Service Configuration Modals */}
                {selectedService === 'tv-installation' && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Configure TV Installation</h4>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">TV Size</label>
                        <select 
                          value={tvOptions.tvSize}
                          onChange={(e) => setTvOptions(prev => ({ ...prev, tvSize: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="32-55">32" - 55"</option>
                          <option value="56-plus">56"+ (Large TV)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mount Type</label>
                        <select 
                          value={tvOptions.mountType}
                          onChange={(e) => setTvOptions(prev => ({ ...prev, mountType: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="fixed">Fixed Mount</option>
                          <option value="tilting">Tilting Mount (+$25)</option>
                          <option value="full-motion">Full Motion (+$50)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 mb-6">
                      <input 
                        type="checkbox"
                        checked={tvOptions.addOutlet}
                        onChange={(e) => setTvOptions(prev => ({ ...prev, addOutlet: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="text-sm text-gray-700">Add electrical outlet (+$150)</label>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold text-gray-900">
                        Total: ${calculateTVInstallPrice(tvOptions)}
                      </div>
                      <div className="space-x-3">
                        <button 
                          onClick={() => setSelectedService(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addToCart('tv-installation', tvOptions)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedService === 'fireplace-tv' && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Fireplace TV Installation</h4>
                    <p className="text-gray-600 mb-6">Professional TV mounting above fireplace with heat management and proper viewing angle.</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold text-gray-900">
                        Total: $200
                      </div>
                      <div className="space-x-3">
                        <button 
                          onClick={() => setSelectedService(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addToCart('fireplace-tv', {})}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedService === 'wire-concealment' && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Wire Concealment & New Outlet</h4>
                    <p className="text-gray-600 mb-6">Install new outlet behind TV and conceal all wires for a clean, professional look.</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold text-gray-900">
                        Total: $100
                      </div>
                      <div className="space-x-3">
                        <button 
                          onClick={() => setSelectedService(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addToCart('wire-concealment', {})}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedService === 'smart-home' && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Configure Smart Home Service</h4>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
                        <select 
                          value={smartHomeOptions.deviceType}
                          onChange={(e) => setSmartHomeOptions(prev => ({ ...prev, deviceType: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="security-camera">Security Camera ($75)</option>
                          <option value="video-doorbell">Smart Doorbell ($85)</option>
                          <option value="floodlight-camera">Smart Floodlight ($125)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input 
                          type="number"
                          min="1"
                          max="10"
                          value={smartHomeOptions.quantity}
                          onChange={(e) => setSmartHomeOptions(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold text-gray-900">
                        Total: ${calculateSmartHomePrice(smartHomeOptions)}
                      </div>
                      <div className="space-x-3">
                        <button 
                          onClick={() => setSelectedService(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addToCart('smart-home', smartHomeOptions)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedService === 'tv-removal' && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">TV Removal Service</h4>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of TVs to Remove</label>
                      <input 
                        type="number"
                        min="1"
                        max="5"
                        value={tvRemovalQuantity}
                        onChange={(e) => setTvRemovalQuantity(parseInt(e.target.value))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold text-gray-900">
                        Total: ${49 * tvRemovalQuantity}
                      </div>
                      <div className="space-x-3">
                        <button 
                          onClick={() => setSelectedService(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addToCart('tv-removal', { quantity: tvRemovalQuantity })}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {cart.items.length > 0 && (
                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={() => setCurrentStep('info')}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Continue to Contact Info
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 'info' && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact Information</h2>
                
                {bookingFormErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <ul className="list-disc list-inside text-red-700 space-y-1">
                      {bookingFormErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="inline h-4 w-4 mr-1" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={bookingInfo.fullName}
                        onChange={(e) => {
                          setBookingInfo(prev => ({ ...prev, fullName: e.target.value }));
                          if (bookingFormErrors.length > 0) setBookingFormErrors([]);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline h-4 w-4 mr-1" />
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={bookingInfo.phone}
                        onChange={(e) => setBookingInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="(404) 555-0123"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={bookingInfo.email}
                      onChange={(e) => setBookingInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      <MapPin className="inline h-5 w-5 mr-1" />
                      Service Address
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                        <input
                          type="text"
                          value={bookingInfo.address.street}
                          onChange={(e) => setBookingInfo(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, street: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="123 Main Street"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                          <input
                            type="text"
                            value={bookingInfo.address.city}
                            onChange={(e) => setBookingInfo(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, city: e.target.value }
                            }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Atlanta"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                          <select
                            value={bookingInfo.address.state}
                            onChange={(e) => setBookingInfo(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, state: e.target.value }
                            }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
                          <input
                            type="text"
                            value={bookingInfo.address.zipCode}
                            onChange={(e) => setBookingInfo(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, zipCode: e.target.value }
                            }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="30309"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions (Optional)</label>
                    <textarea
                      value={bookingInfo.notes}
                      onChange={(e) => setBookingInfo(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
                      placeholder="Any special instructions or notes for our technician..."
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-8">
                  <button 
                    onClick={() => setCurrentStep('services')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back to Services
                  </button>
                  <button 
                    onClick={() => {
                      const errors = validateBookingForm();
                      setBookingFormErrors(errors);
                      if (errors.length === 0) {
                        setCurrentStep('scheduling');
                      }
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Continue to Scheduling
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Scheduling */}
            {currentStep === 'scheduling' && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Select Date & Time</h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Available Dates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {availableDates.map((date) => (
                        <button
                          key={date.date}
                          onClick={() => {
                            setSelectedDate(date.date);
                            loadAvailableSlots(date.date);
                          }}
                          className={`p-3 text-center rounded-lg border-2 transition-all ${
                            selectedDate === date.date
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-300 text-gray-700'
                          }`}
                        >
                          <div className="font-medium text-sm">{date.display}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDate && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Available Times</h3>
                      {loadingSlots ? (
                        <div className="text-center py-8 text-gray-600">Loading available times...</div>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setSelectedTime(slot)}
                              className={`p-3 text-center rounded-lg border-2 transition-all ${
                                selectedTime === slot
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-blue-300 text-gray-700'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-8">
                  <button 
                    onClick={() => setCurrentStep('info')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back to Contact Info
                  </button>
                  {selectedDate && selectedTime && (
                    <button 
                      onClick={() => setCurrentStep('review')}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Review Booking
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 'review' && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Review Your Booking</h2>
                
                <div className="space-y-8">
                  {/* Customer Info */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Customer:</p>
                        <p className="font-medium">{bookingInfo.fullName}</p>
                        <p className="text-gray-600 mt-2">Email:</p>
                        <p className="font-medium">{bookingInfo.email}</p>
                        <p className="text-gray-600 mt-2">Phone:</p>
                        <p className="font-medium">{bookingInfo.phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Service Address:</p>
                        <p className="font-medium">
                          {bookingInfo.address.street}<br />
                          {bookingInfo.address.city}, {bookingInfo.address.state} {bookingInfo.address.zipCode}
                        </p>
                        {bookingInfo.notes && (
                          <>
                            <p className="text-gray-600 mt-2">Special Instructions:</p>
                            <p className="font-medium">{bookingInfo.notes}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Details</h3>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">
                          {availableDates.find(d => d.date === selectedDate)?.full}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Services Summary */}
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Services Summary</h3>
                    <div className="space-y-3">
                      {cart.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className="font-medium">{item.displayName}</span>
                          <span className="text-lg font-bold">${item.price}</span>
                        </div>
                      ))}
                      <div className="border-t border-green-200 pt-3 flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-green-600">${cart.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-8">
                  <button 
                    onClick={() => setCurrentStep('scheduling')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back to Scheduling
                  </button>
                  <button 
                    onClick={completeBooking}
                    disabled={completingBooking}
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>{completingBooking ? 'Completing Booking...' : 'Complete Booking'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>
              
              {cart.items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No services selected</p>
              ) : (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start pb-4 border-b border-gray-100">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.displayName}</h4>
                        <p className="text-sm text-gray-600 capitalize">{item.serviceType.replace('-', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${item.price}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1 mt-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Total:</span>
                      <span>${cart.total}</span>
                    </div>
                    <p className="text-sm text-gray-600">* Final pricing confirmed after inspection</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}