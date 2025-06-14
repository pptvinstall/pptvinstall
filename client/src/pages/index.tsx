export default function HomePage() {
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
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 px-8 rounded-lg shadow-lg transition-colors duration-200 text-lg">
          TV Installation
        </button>

        {/* TV De-Installation Button */}
        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 px-8 rounded-lg shadow-lg transition-colors duration-200 text-lg">
          TV De-Installation
        </button>

        {/* Smart Home Devices Button */}
        <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 px-8 rounded-lg shadow-lg transition-colors duration-200 text-lg">
          Smart Home Devices
        </button>
      </div>
    </div>
  );
}