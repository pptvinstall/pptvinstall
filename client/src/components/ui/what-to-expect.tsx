import { CheckCircle, Clock, Shield, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export function WhatToExpect() {
  const steps = [
    {
      icon: User,
      title: "Professional Arrival",
      description: "Our certified technician arrives on time with all necessary tools and equipment.",
      time: "Day of service"
    },
    {
      icon: Shield,
      title: "Safety Assessment",
      description: "We inspect your wall structure and locate studs to ensure secure mounting.",
      time: "15 minutes"
    },
    {
      icon: CheckCircle,
      title: "Expert Installation",
      description: "Your TV is mounted with precision, cables are managed, and everything is tested.",
      time: "30-60 minutes"
    },
    {
      icon: Clock,
      title: "Quality Check",
      description: "We verify the installation, clean up, and ensure you're completely satisfied.",
      time: "Final 10 minutes"
    }
  ];

  return (
    <Card className="modern-card">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900">
          What to Expect on Installation Day
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Here's how our professional installation process works
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-blue-50 transition-colors duration-200">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <step.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <span className="text-sm text-blue-600 font-medium">
                  {step.time}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
        
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">
              30-Day Service Guarantee
            </span>
          </div>
          <p className="text-green-700 mt-1 text-sm">
            We stand behind our work with a comprehensive warranty on all installations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}