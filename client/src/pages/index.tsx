import { useState } from 'react';

export default function HomePage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PPTVInstall</h1>
        <p className="text-gray-600">Choose Your Service</p>
      </div>

      {/* Service Buttons */}
      <div className="w-full max-w-sm space-y-4">
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
    </div>
  );
}