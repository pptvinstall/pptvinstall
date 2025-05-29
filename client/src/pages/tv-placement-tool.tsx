import { TVPlacementTool } from '@/components/ui/tv-placement-tool';
import { Layout, Zap, Target, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TVPlacementToolPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500 bg-opacity-20 px-4 py-2 rounded-full mb-6">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Smart Technology</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              TV Placement Visualization Tool
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Design your perfect room layout and get professional TV placement recommendations 
              from Atlanta's premier installation experts
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center gap-3">
                <Layout className="h-6 w-6 text-blue-300" />
                <span>Interactive Design</span>
              </div>
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-blue-300" />
                <span>Optimal Positioning</span>
              </div>
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-blue-300" />
                <span>Expert Recommendations</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tool Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <TVPlacementTool />
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Why Use Our Placement Tool?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Layout className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Visual Planning</h3>
                  <p className="text-gray-600">
                    See exactly how your TV will look in your space before installation
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Perfect Positioning</h3>
                  <p className="text-gray-600">
                    Get optimal viewing angles and distances for maximum comfort
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="bg-orange-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Award className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Expert Insights</h3>
                  <p className="text-gray-600">
                    Recommendations based on thousands of professional installations
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}